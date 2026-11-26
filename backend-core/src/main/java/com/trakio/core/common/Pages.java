package com.trakio.core.common;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/** Page requests with a hard cap on size, so nobody can ask for a million rows at once. */
public final class Pages {

    public static final int MAX_SIZE = 100;

    private Pages() {}

    public static PageRequest of(int page, int size, Sort sort) {
        return PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_SIZE), sort);
    }
}
