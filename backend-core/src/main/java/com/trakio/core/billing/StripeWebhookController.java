package com.trakio.core.billing;

import com.trakio.core.common.ApiException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
class StripeWebhookController {

    private final ObjectProvider<StripeWebhookHandler> handler;

    StripeWebhookController(ObjectProvider<StripeWebhookHandler> handler) {
        this.handler = handler;
    }

    @PostMapping("/api/v1/billing/stripe/webhook")
    ResponseEntity<Void> receive(@RequestBody String payload,
            @RequestHeader(name = "Stripe-Signature", required = false) String signature) {
        StripeWebhookHandler stripe = handler.getIfAvailable();
        if (stripe == null) {
            throw ApiException.notFound("Este endereço");
        }
        if (signature == null || signature.isBlank()) {
            throw ApiException.badRequest("invalid-signature", "Assinatura inválida.");
        }
        stripe.handle(stripe.verify(payload, signature));
        return ResponseEntity.ok().build();
    }
}
