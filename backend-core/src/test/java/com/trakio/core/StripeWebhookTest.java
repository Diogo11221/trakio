package com.trakio.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

/** With Stripe configured, only correctly signed events change anything — and each only once. */
@TestPropertySource(properties = {
    "trakio.payments.provider=stripe",
    "trakio.payments.stripe.secret-key=sk_test_dummy",
    "trakio.payments.stripe.webhook-secret=whsec_test_secret",
    "trakio.payments.stripe.premium-price-id=price_premium",
    "trakio.payments.stripe.marketplace-price-id=price_marketplace"
})
class StripeWebhookTest extends IntegrationTest {

    private static final String SECRET = "whsec_test_secret";

    @Test
    void forgedEventsAreRejectedAndSignedOnesActivatePremiumOnce() throws Exception {
        Session s = client();
        String payload = """
                {"id":"evt_%s","object":"event","api_version":"2020-08-27","type":"checkout.session.completed",
                 "data":{"object":{"id":"cs_test_1","object":"checkout.session","mode":"subscription",
                   "subscription":"sub_%s","customer":"cus_1","payment_status":"paid",
                   "metadata":{"userId":"%s","kind":"PREMIUM"}}}}
                """.formatted(s.id(), s.id(), s.id());

        // No signature, or signed with the wrong secret: nothing happens.
        assertThat(send(payload, null)).isEqualTo(400);
        assertThat(send(payload, signature(payload, "whsec_wrong"))).isEqualTo(400);
        assertThat(call(get("/api/v1/me"), s, null, 200).get("premium").asBoolean()).isFalse();

        // Correctly signed: Premium is on. Delivered twice: handled once.
        assertThat(send(payload, signature(payload, SECRET))).isEqualTo(200);
        assertThat(send(payload, signature(payload, SECRET))).isEqualTo(200);
        assertThat(call(get("/api/v1/me"), s, null, 200).get("premium").asBoolean()).isTrue();
    }

    @Test
    void oldSignaturesAreRejected() throws Exception {
        String payload = "{\"id\":\"evt_old\",\"object\":\"event\",\"type\":\"ping\",\"data\":{\"object\":{}}}";
        long tenMinutesAgo = System.currentTimeMillis() / 1000 - 600;
        assertThat(send(payload, signature(payload, SECRET, tenMinutesAgo))).isEqualTo(400);
    }

    private int send(String payload, String signature) throws Exception {
        var request = post("/api/v1/billing/stripe/webhook").contentType("application/json").content(payload);
        if (signature != null) {
            request.header("Stripe-Signature", signature);
        }
        return mvc.perform(request).andReturn().getResponse().getStatus();
    }

    private static String signature(String payload, String secret) throws Exception {
        return signature(payload, secret, System.currentTimeMillis() / 1000);
    }

    private static String signature(String payload, String secret, long timestamp) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String v1 = HexFormat.of().formatHex(mac.doFinal((timestamp + "." + payload).getBytes(StandardCharsets.UTF_8)));
        return "t=" + timestamp + ",v1=" + v1;
    }
}
