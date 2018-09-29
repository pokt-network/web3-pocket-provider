# Web3.js Pocket Provider
A web3 Provider to connect to any Ethereum Pocket Node endpoint.

# Pre-requisites
1. [Web3.js 1.x^](https://web3js.readthedocs.io/en/1.0/)
2. A way to sign transactions client side (like [Lightwallet](https://github.com/ConsenSys/eth-lightwallet)).

# TransactionSigner Interface
The idea for this interface comes from the [Hooked Web3 Provider project](https://github.com/ConsenSys/hooked-web3-provider).

The TransactionSigner interface will allow you to implement the custom logic to sign transactions client side, and whenever `sendTransaction` is used, it will be swapped to `sendRawTransaction` with a payload of your transaction signed with the specified private key.

## hasAddress(address, callback)

## signTransaction(txObj, callback)




