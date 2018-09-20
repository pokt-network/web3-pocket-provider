/**
 * @author Luis C. de Leon <luis@pokt.network>
 */

// Imported packages
var web3Errors = require('web3-core-helpers').errors;
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
var PocketProvider = function PocketProvider(host, options) {
    options = options || {};
    this.host = host || 'https://ethereum.pokt.network';
    this.timeout = options.timeout || 0;
    this.headers = options.headers;
    this.connected = false;
    this.networkId = options.networkId || '4';
};

/**
 * Method to create a new XHR2 instance
 * @method _generateHttpRequest
 * @returns {XHR2}
 */
PocketProvider.prototype._generateHttpRequest = function() {
    var request = new XHR2();

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
    return (TRANSACTION_METHODS.includes(method)) ? TRANSACTION : QUERY;
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
 * @returns {Object}
 */
PocketProvider.prototype._generateQueryBody = function(payload) {
    return {
        "network": ETH_NETWORK,
        "subnetwork": this.networkId,
        "query": {
            rpc_method = payload.method,
            rpc_params = payload.params
        },
        "decoder": {}
    }
}

/**
 * Method to generate the query body according to the given JSON-RPC payload
 * @method _generateTransactionBody
 * @param {Object} payload
 * @returns {Object}
 */
PocketProvider.prototype._generateTransactionBody = function (payload) {
    // TODO: Implement this
    return null;
}

/**
 * Sets the onreadystatechange callback for a query http request
 * @method _onQueryResponse
 * @param {XHR2} httpRequest
 */
PocketProvider.prototype._onQueryResponse = function(httpRequest, callback) {
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
            callback(error, result);
        }
    }
}

/**
 * Sets the onreadystatechange callback for a transaction http request
 * @method _onTransactionResponse
 * @param {XHR2} httpRequest
 */
PocketProvider.prototype._onTransactionResponse = function(httpRequest) {
    // TODO: Implement this
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
 * @param {XHR2} httpRequest
 * @param {Object} payload
 * @param {Function} callback
 * @returns {Object} http request body to be sent
 */
PocketProvider.prototype._configureRequest = function(httpRequest, payload, callback) {
    var requestType = this._getRequestType(payload),
        requestBody = null;

    if (requestType === QUERY) {
        requestBody = this._generateQueryBody(payload);
        httpRequest.open('POST', this._getQueryURL(), true);
        this._onQueryResponse(httpRequest);
    } else if (requestType === TRANSACTION) {
        requestBody = this._generateTransactionBody(payload);
        httpRequest.open('POST', this._getTransactionURL(), true);
        this._onTransactionResponse(httpRequest);
    }

    // Set the timeout callback
    this._onTimeOut(httpRequest, callback);

    return requestBody;
}

/**
 * Method used by web3.js to send an asynchronous request
 * @method send
 * @param {Object} payload
 * @param {Function} callback triggered on end with (err, result)
 */
PocketProvider.prototype.send = function(payload, callback) {
    var httpRequest = this._generateHttpRequest();
        requestBody = this._configureRequest(httpRequest, payload, callback);

    if(requestBody !== null && requestBody !== undefined) {
        try {
            httpRequest.send(JSON.stringify(requestBody));
        } catch (error) {
            this.connected = false;
            callback(web3Errors.InvalidConnection(this.host));
        }
    } else {
        callback(pocketProviderErrors.InvalidRequestBody(payload));
    }
};

module.exports = PocketProvider;