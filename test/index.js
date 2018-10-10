var assert = require('assert');
var PocketProvider = require('../src/index');
var EthereumTx = require('ethereumjs-tx');

var TestTransactionSigner = {
    hasAddress: function(address, callback) {
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
    networkId: '5777'
}

var TestHost = 'http://localhost:3000';

describe('PocketProvider', function () {
    
    describe('#send', function() {
        var provider = new PocketProvider(TestHost, TestTransactionSigner, TestOptions);

        // Fetch accounts from the node
        before(function(done) {
            var query = {"jsonrpc": "2.0", "method": "eth_accounts", "params": [], "id": 1};
            provider.send(query, function (err, result) {
                if(err != null) {
                    throw err;
                }
                TestTransactionSigner.accounts = result;
                done();
            });
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
                "value": "0xDE0B6B3A7640000",
                "gas": "0x3B9AC9FF",
                "gasPrice": "0x1"
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
    });
});