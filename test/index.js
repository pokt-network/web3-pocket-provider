var assert = require('assert');
var PocketProvider = require('../src/index');
var EthereumTx = require('ethereumjs-tx');

var TestTransactionSigner = {
    hasAddress: function(address, callback) {
        console.log(TestTransactionSigner.accounts);
        callback(null, TestTransactionSigner.accounts.includes(address));
    },
    signTransaction: function(txParams, callback) {
        var pkString = Object.values(TestTransactionSigner.privateKeys)[0];
        var privateKeyBuffer = Buffer.from(pkString, 'hex');
        var tx = new EthereumTx(txParams);
        tx.sign(privateKeyBuffer);
        callback(null, '0x' + tx.serialize().toString('hex'));
    },
    // Needs at least 2 accounts in the node to run all tests
    accounts: [],
    // TODO: Improve this
    // Update this object with the address - private keys for each account in the same order they are declared
    privateKeys: {}
}

var TestOptions = {
    networkId: '4'
}

var TestHost = 'https://ethereum.pokt.network';

describe('PocketProvider', function () {
    
    describe('#send', function() {
        var provider = new PocketProvider(TestHost, TestTransactionSigner, TestOptions);

        // Fetch accounts from the node if the accounts array is empty
        before(function(done) {
            if (TestTransactionSigner.accounts.length === 0) {
                var query = {
                    "jsonrpc": "2.0",
                    "method": "eth_accounts",
                    "params": [],
                    "id": 1
                };
                provider.send(query, function (err, result) {
                    if (err != null) {
                        throw err;
                    }
                    TestTransactionSigner.accounts = result;
                    done();
                });
            } else {
                done();
            }
        });

        it('should submit queries', function (done) {
            var query = {"jsonrpc":"2.0","method":"eth_getBalance","params":[TestTransactionSigner.accounts[0],"latest"],"id":1};
            provider.send(query, function(err, result) {
                if(err != null) {
                    throw err;
                }
                assert.ok(result);
                done();
            });
        });

        it('should submit transactions using eth_sendTransaction', function (done) {
            // Transfers 1 eth from accounts[0] to accounts[1]
            var tx = {
                "from": TestTransactionSigner.accounts[0],
                "to": TestTransactionSigner.accounts[1],
                "value": "0x186A0",
                "gas": "0x5208",
                "gasPrice": "0x3B9ACA00"
            }
            var txRequest = {"jsonrpc":"2.0","method":"eth_sendTransaction","params":[tx],"id":1};
            provider.send(txRequest, function(err, result) {
                if(err != null) {
                    throw err;
                }
                assert.ok(result);
                done();
            });
        });

        it('should submit transactions using eth_sendRawTransaction', function (done) {
            // Transfers 1 eth from accounts[0] to accounts[1]
            var tx = {
                "from": TestTransactionSigner.accounts[0],
                "to": TestTransactionSigner.accounts[1],
                "value": "0x186A0",
                "gas": "0x5208",
                "gasPrice": "0x3B9ACA00"
            }
            TestTransactionSigner.signTransaction(tx, function(error, rawTx){
                // Asserts signing worked
                assert.equal(error, null);

                // Sends the transaction
                var txRequest = {
                    "jsonrpc": "2.0",
                    "method": "eth_sendRawTransaction",
                    "params": [rawTx],
                    "id": 1
                };
                provider.send(txRequest, function (err, result) {
                    if (err !== null) {
                        throw err;
                    }
                    // Assert transaction result
                    assert.ok(result);
                    done();
                });
            });
        });
    });
});