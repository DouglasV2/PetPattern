package com.petpattern.auth;

import com.petpattern.domain.Owner;

/**
 * Per-request holder for the authenticated owner, populated by
 * {@link SessionAuthFilter} and cleared at the end of the request.
 */
public final class OwnerContext {

    private static final ThreadLocal<Owner> CURRENT = new ThreadLocal<>();

    private OwnerContext() {
    }

    public static void set(Owner owner) {
        CURRENT.set(owner);
    }

    public static Owner get() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }
}
