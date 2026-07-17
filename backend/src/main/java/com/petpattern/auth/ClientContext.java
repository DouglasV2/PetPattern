package com.petpattern.auth;

/**
 * Per-request holder for the calling client's platform and app version, populated by
 * {@link SessionAuthFilter} from the {@code X-PetPattern-Platform} / {@code X-PetPattern-App-Version}
 * request headers and cleared at the end of the request.
 *
 * <p>It lets server-recorded analytics attribute a real platform (web / android / ios) and app
 * version to server-generated events instead of hardcoding {@code "web"}. The raw header values are
 * NOT trusted here — {@code AnalyticsService} validates the platform against its allow-list and the
 * app version against a version-shape regex before anything is stored.
 */
public final class ClientContext {

    private static final ThreadLocal<String> PLATFORM = new ThreadLocal<>();
    private static final ThreadLocal<String> APP_VERSION = new ThreadLocal<>();

    private ClientContext() {
    }

    public static void set(String platform, String appVersion) {
        PLATFORM.set(platform);
        APP_VERSION.set(appVersion);
    }

    /** Raw client platform header, or {@code null}. Validated/normalized downstream. */
    public static String platform() {
        return PLATFORM.get();
    }

    /** Raw client app-version header, or {@code null}. Validated/normalized downstream. */
    public static String appVersion() {
        return APP_VERSION.get();
    }

    public static void clear() {
        PLATFORM.remove();
        APP_VERSION.remove();
    }
}
