/**
 * @author Luis C. de Leon <luis@pokt.network>
 */

"use strict";

module.exports = {
    UnsupportedMethodCall: function(method) {
        return new Error('Unsupported method call: ' + method);
    },
    InvalidRequestBody: function(payload) {
        return new Error('Invalid request body for payload ' + payload);
    }
};
