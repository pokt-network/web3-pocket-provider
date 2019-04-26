# NOTE:
This repository has been deprecated, please visit the [PocketJS repository for the latest on Pocket Javascript client development.](https://github.com/pokt-network/pocket-js)

# Web3.js Pocket Provider
A Web3.js Provider to connect to any Ethereum Pocket Node endpoint. To find out more about Pocket Node please visit the [repo](https://github.com/pokt-network/pocket-node).

# Pre-requisites
1. [Web3.js 1.x^](https://web3js.readthedocs.io/en/1.0/)
2. A way to sign transactions client side (like [Lightwallet](https://github.com/ConsenSys/eth-lightwallet) or [ethereumjs-tx](https://github.com/ethereumjs/ethereumjs-tx)).
3. A Pocket Node to connect to (e.g. https://ethereum.pokt.network), or [learn how to run your own](https://github.com/pokt-network/pocket-node).

# Install

`npm install --save web3-pocket-provider`

If you're using NodeJS you can just do a require:

`const PocketProvider = require('web3-pocket-provider');`

If you're on the browser just import the `index.js` file in the `dist` directory of the npm package:

`<script src="<./node_modules/web3-pocket-provider/dist/index.js>"></script>`

# Usage

To create a new provider you just need to:

```
var transactionSigner = {
    hasAddress: function(address, callback) {
        // insert your implementation
    },
    signTransaction: function(txParams, callback) {
        // insert your implementation
    }
};

var options = {
    // Connect to the Rinkeby chain
    networkId: '4',
    // Set the timeout in ms, set to 0 for no timeout
    timeout: 0
}

// You can swap the host however you want
var pocketProvider = new PocketProvider('https://ethereum.pokt.network', transactionSigner, options);

// Procure your web3 instance and set the provider
web3.setProvider(pocketProvider);
```

# TransactionSigner Interface
The idea for this interface comes from the [Hooked Web3 Provider project](https://github.com/ConsenSys/hooked-web3-provider).

The TransactionSigner interface will allow you to implement the custom logic to sign transactions client side, and whenever `sendTransaction` is used, it will be swapped to `sendRawTransaction` with a payload of your transaction signed with the specified private key.

## Methods of the TransactionSigner interface
You will need to implement the following 2 methods:

### **hasAddress(address, callback)**
Asynchronous method called to determine wether or not the `TransactionSigner` supports signing transactions for the given `address`. Read below about the arguments for this function:

- `address`: The hex string representation of the address to check.
- `function(error, boolean)`: The `error` parameter will indicate whether or not an error ocurred while checking the `address`, and the `boolean` parameter will indicate whether or not the `address` is supported by the `TransactionSigner`.
 
### **signTransaction(txObj, callback)**

Asynchronous method called to generate a serialized signed format of the given `txObj`. Read below about the arguments for this function:

- `txObj`: An object containing the transaction parameters, it must follow the [Ethereum JSON-RPC specification for eth_sendTransaction parameters](https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sendtransaction).
- `function(error, rawTx)`: The `error` parameter will indicate if an error ocurred signing the transaction, the `rawTx` string will contained the serialized signed transaction in hexadecimal format.

# Support

You can reach out to us through our website: [https://pokt.network](https://pokt.network) where you can find our Social Media accounts, and access to our Slack workspace where you can ask us any questions.




