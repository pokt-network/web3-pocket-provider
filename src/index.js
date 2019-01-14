/**
 * @author Luis C. de Leon <luis@pokt.network>
 */

// Imported packages
var web3Errors = require('web3-core-helpers').errors;
var web3Utils = require('web3-utils');
var pocketProviderErrors = require('./errors');
var XHR2 = require('xhr2');

// Constants
const TRANSACTION_METHODS = ['eth_sendTransaction', 'eth_sendRawTransaction'];
const ETH_NETWORK = 'ETH';
const QUERY = 'QUERY';
const TRANSACTION = 'TRANSACTION';

/**
 * PocketProvider
 * Sends queries and transactions to a Pocket Node via HTTP
 */
var PocketProvider = function PocketProvider(host, transactionSigner, options) {
    options = options || {};
    this.host = host || 'https://ethereum.pokt.network';
    this.setTransactionSigner(transactionSigner);
    this.timeout = options.timeout || 0;
    this.headers = options.headers;
    this.connected = false;
    this.networkId = options.networkId || '4';
    // Make sure networkId is a string
    this.networkId = this.networkId.toString();
};

/**
 * Sets the transactionSigner property
 * The TransactionSigner interface idea comes from: https://github.com/ConsenSys/hooked-web3-provider
 * @param {Object} transactionSigner Object containing the TransactionSigner interface methods.
 */
PocketProvider.prototype.setTransactionSigner = function(transactionSigner) {
    if (transactionSigner && typeof transactionSigner.hasAddress === 'function' && typeof transactionSigner.signTransaction === 'function') {
        this.transactionSigner = transactionSigner;
    } else {
        throw pocketProviderErrors.InvalidTransactionSigner(transactionSigner);
    }
}

/**
 * Method to create a new XHR2 instance
 * @method _generateHttpRequest
 * @param {String} url
 * @returns {XHR2}
 */
PocketProvider.prototype._generateHttpRequest = function(url) {
    var request = new XHR2();

    request.open('POST', url, true);
    request.setRequestHeader('Content-Type', 'application/json');
    request.timeout = this.timeout && this.timeout !== 1 ? this.timeout : 0;

    if (this.headers) {
        this.headers.forEach(function (header) {
            request.setRequestHeader(header.name, header.value);
        });
    }

    return request;
}

/**
 * Method that indicates whether the payload is a Query or a Transaction
 * @method _getRequestType
 * @param {payload}
 * @returns {String} QUERY|TRANSACTION
 */
PocketProvider.prototype._getRequestType = function(payload) {
    return (TRANSACTION_METHODS.includes(payload.method)) ? TRANSACTION : QUERY;
}

/**
 * Method to get the current query URL
 * @method _getQueryURL
 * @returns {String} full path to the /queries endpoint
 */
PocketProvider.prototype._getQueryURL = function() {
    return this.host + '/queries';
}

/**
 * Method to get the current transaction URL
 * @method _getTransactionURL
 * @returns {String} full path to the /transactions endpoint
 */
PocketProvider.prototype._getTransactionURL = function () {
    return this.host + '/transactions';
}

/**
 * Method to generate the query body according to the given JSON-RPC payload
 * @method _generateQueryBody
 * @param {Object} payload
 * @param {XHR2} httpRequest
 * @param {Function} callback
 * @returns {Object}
 */
PocketProvider.prototype._generateQueryBody = function(payload, httpRequest, callback) {
    var queryBody = {
        "network": ETH_NETWORK,
        "subnetwork": this.networkId,
        "query": {
            rpc_method: payload.method,
            rpc_params: payload.params
        },
        "decoder": {}
    }
    callback(null, httpRequest, queryBody);
}

/**
 * Method to get the nonce for a given address
 * @method _getNonce
 * @param {String} sender
 * @param {Function} callback
 */
PocketProvider.prototype._getNonce = function(sender, callback) {
    this.send({
        jsonrpc: '2.0',
        method: 'eth_getTransactionCount',
        params: [sender, "latest"],
        id: (new Date()).getTime()
    }, function (err, response) {
        if (err != null) {
            callback(err);
        } else {
            var nonce = web3Utils.toDecimal(response.result);
            callback(null, nonce);
        }
    });
}

/**
 * @method _parseTransactionParams
 * @param {Object} payload
 * @param {XHR2} httpRequest
 * @param {Function} callback
 */
PocketProvider.prototype._parseTransactionParams = function(payload, httpRequest, callback) {
    var txParams = payload.params[0];
    var sender = txParams.from;
    var _this = this;

    // Verify address exists in the TransactionSigner
    _this.transactionSigner.hasAddress(sender, function (err, hasAddress) {
        if (err !== null || hasAddress === false) {
            return callback(err);
        }

        // Get the nonce for the sender
        _this._getNonce(sender, function (err, nonce) {
            if (err !== null) {
                return callback(err);
            }

            txParams.nonce = web3Utils.toHex(nonce);

            // Signs the transaction with the updated nonce
            _this.transactionSigner.signTransaction(txParams, function (err, rawTx) {
                if (err !== null) {
                    return callback(err);
                }

                var transactionBody = {
                    "network": ETH_NETWORK,
                    "subnetwork": _this.networkId,
                    "serialized_tx": rawTx,
                    "tx_metadata": {}
                }
                callback(null, httpRequest, transactionBody);
            });
        });
    });
}

/**
 * Method to generate the query body according to the given JSON-RPC payload
 * @method _generateTransactionBody
 * @param {Object} payload
 * @param {XHR2} httpRequest
 * @param {Function} callback
 */
PocketProvider.prototype._generateTransactionBody = function(payload, httpRequest, callback) {
    var method = payload.method;

    if(method === 'eth_sendTransaction') {
        this._parseTransactionParams(payload, httpRequest, callback);
    } else if(method === 'eth_sendRawTransaction') {
        var transactionBody = {
            "network": ETH_NETWORK,
            "subnetwork": this.networkId,
            "serialized_tx": payload.params[0],
            "tx_metadata": {}
        }
        callback(null, httpRequest, transactionBody);
    } else {
        callback(pocketProviderErrors.InvalidRequestBody(payload));
    }
}

/**
 * Sets the onreadystatechange callback for a query http request
 * @method _onQueryResponse
 * @param {XHR2} httpRequest
 * @param {Object} payload
 * @param {Function} callback
 */
PocketProvider.prototype._onQueryResponse = function(httpRequest, payload, callback) {
    var _this = this;
    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4 && httpRequest.timeout !== 1) {
            var rawQueryResponse = httpRequest.responseText,
                error = null,
                result = null;

            try {
                const queryResponse = JSON.parse(rawQueryResponse);
                result = queryResponse.result;
                if (result === undefined) {
                    error = web3Errors.InvalidResponse(rawQueryResponse);
                }
            } catch (e) {
                error = web3Errors.InvalidResponse(rawQueryResponse);
            }

            _this.connected = true;
            var response = {
                "id": payload.id,
                "jsonrpc": "2.0",
                "result": result
            }
            callback(error, response);
        }
    }
}

/**
 * Sets the onreadystatechange callback for a transaction http request
 * @method _onTransactionResponse
 * @param {XHR2} httpRequest
 * @param {Object} payload
 * @param {Function} callback
 */
PocketProvider.prototype._onTransactionResponse = function(httpRequest, payload, callback) {
    var _this = this;
    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === 4 && httpRequest.timeout !== 1) {
            var rawTxResponse = httpRequest.responseText,
                error = null,
                txHash = null;

            try {
                const txResponse = JSON.parse(rawTxResponse);
                txHash = txResponse.hash;
                if (txHash === undefined) {
                    error = web3Errors.InvalidResponse(rawTxResponse);
                    _this.connected = false;
                } else {
                    _this.connected = true;
                }
            } catch (e) {
                error = web3Errors.InvalidResponse(rawTxResponse);
                _this.connected = false;
            }

            var response = {
                "id": payload.id,
                "jsonrpc": "2.0",
                "result": txHash
            }
            callback(error, response);
        }
    }
}

/**
 * Sets the ontimeout callback method for the given httpRequest
 * @method _onTimeOut
 * @param {XHR2} httpRequest
 * @param {Function} callback
 */
PocketProvider.prototype._onTimeOut = function (httpRequest, callback) {
    var _this = this;

    httpRequest.ontimeout = function () {
        _this.connected = false;
        callback(web3Errors.ConnectionTimeout(this.timeout));
    };
}

/**
 * Method for the configuration of the http request sent to the Pocket Node
 * @method _configureRequest
 * @param {Object} payload
 * @param {Function} requestCallback
 * @param {Function} finished
 * @returns {Object} http request body to be sent
 */
PocketProvider.prototype._generateRequestBody = function(payload, requestCallback, finished) {
    var requestType = this._getRequestType(payload);

    if (requestType === QUERY) {
        var httpRequest = this._generateHttpRequest(this._getQueryURL());
        this._onTimeOut(httpRequest, requestCallback);
        this._onQueryResponse(httpRequest, payload, requestCallback);
        this._generateQueryBody(payload, httpRequest, finished);
    } else if (requestType === TRANSACTION) {
        var httpRequest = this._generateHttpRequest(this._getTransactionURL());
        this._onTimeOut(httpRequest, requestCallback);
        this._onTransactionResponse(httpRequest, payload, requestCallback);
        this._generateTransactionBody(payload, httpRequest, finished);
    }
}

/**
 * Method used by web3.js to send an asynchronous request
 * @method send
 * @param {Object} payload
 * @param {Function} callback triggered on end with (err, result)
 */
PocketProvider.prototype.send = function(payload, callback) {
    this._generateRequestBody(payload, callback, function (err, httpRequest, requestBody) {
        if(err != null) {
            callback(err);
        }

        if (requestBody !== null && requestBody !== undefined) {
            try {
                httpRequest.send(JSON.stringify(requestBody));
            } catch (error) {
                this.connected = false;
                callback(web3Errors.InvalidConnection(this.host));
            }
        } else {
            callback(pocketProviderErrors.InvalidRequestBody(payload));
        }
    });
};

module.exports = PocketProvider;
