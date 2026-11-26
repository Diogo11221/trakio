package com.trakio.core.billing;

import java.util.UUID;

/** Published by billing so coaching can react without billing depending on it. */
public final class PaymentEvents {

    private PaymentEvents() {}

    public record CoachingPaid(UUID relationshipId) {}

    public record CoachingRefunded(UUID relationshipId) {}

    public record CoachingCheckoutFailed(UUID relationshipId) {}
}
