/**
 * @author Luis C. de Leon <luis@pokt.network>
 */

"use strict";

module.exports = {
    InvalidRequestBody: function(payload) {
        return new Error('Invalid request body for payload ' + payload);
    },
    InvalidTransactionSigner: function(transactionSigner) {
        return new Error('Invalid transaction signer: ' + transactionSigner);
    }
};
