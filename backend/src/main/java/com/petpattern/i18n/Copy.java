package com.petpattern.i18n;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.Protein;
import org.springframework.context.i18n.LocaleContextHolder;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Backend copy localization — the same philosophy as the frontend i18n: the
 * English string IS the key, Croatian lives in one override map, and anything
 * untranslated gracefully falls back to English.
 *
 * <p>The locale comes from the request's {@code Accept-Language} header, which
 * Spring MVC already resolves into {@link LocaleContextHolder} — no custom
 * filter needed. Outside a request (scheduled jobs) it falls back to English.
 *
 * <p>Placeholders are {@code {0}}, {@code {1}}, … replaced verbatim (not
 * {@link java.text.MessageFormat}, whose apostrophe escaping would mangle
 * strings like {@code "Bella's"}). A Croatian template may legitimately omit a
 * placeholder the English one uses — Croatian often reads more naturally
 * without the pet's name, whose declension we must not fake.
 *
 * <p>Croatian style rules (hard product rules): natural, short, human;
 * non-diagnostic ("mogući obrazac", "vrijedi spomenuti veterinaru", "nije
 * dijagnoza", "zabilježeno je"); no gendered participles for the pet or the
 * reader; no name declension — restructure the sentence instead.
 */
public final class Copy {

    private Copy() {
    }

    // Croatian stays inline in this class (the HR map below). The other locales
    // load from /i18n/<code>.json resources, so adding a language is a data change,
    // not a code change. Any locale missing a key falls back to English.
    private static final Set<String> EXTRA_LANGS =
            Set.of("de", "es", "fr", "it", "no", "pl", "nl", "sv", "da", "pt", "ro", "cs", "sk", "el");
    private static final Map<String, Map<String, String>> EXTRA = loadExtra();

    private static Map<String, Map<String, String>> loadExtra() {
        Map<String, Map<String, String>> all = new HashMap<>();
        ObjectMapper mapper = new ObjectMapper();
        for (String code : EXTRA_LANGS) {
            try (InputStream in = Copy.class.getResourceAsStream("/i18n/" + code + ".json")) {
                if (in != null) {
                    all.put(code, mapper.readValue(in, new TypeReference<Map<String, String>>() {}));
                }
            } catch (IOException ex) {
                // Missing/broken locale file — that language falls back to English.
            }
        }
        return all;
    }

    // Publicly served backend languages for v0.1.0-beta. The EXTRA locale maps stay
    // loaded (see EXTRA_LANGS) as future work, but are intentionally NOT served
    // until each is complete end-to-end — beta serves only Croatian; every other
    // Accept-Language (de, fr, es, …) falls back to English. To re-enable one, add
    // its code here once it is fully localized.
    private static final Set<String> BETA_PUBLIC_LANGS = Set.of("hr");

    /** The request's language code, gated to the beta-public set (else "en"). */
    private static String lang() {
        String code = LocaleContextHolder.getLocale().getLanguage().toLowerCase(Locale.ROOT);
        return BETA_PUBLIC_LANGS.contains(code) ? code : "en";
    }

    public static boolean isHr() {
        return "hr".equals(lang());
    }

    /** The active locale for date formatting (month names etc.). */
    public static Locale locale() {
        String lang = lang();
        return ("hr".equals(lang) || EXTRA_LANGS.contains(lang)) ? Locale.forLanguageTag(lang) : Locale.ENGLISH;
    }

    public static String t(String english, Object... args) {
        String lang = lang();
        String template = english;
        if ("hr".equals(lang)) {
            template = HR.getOrDefault(english, english);
        } else {
            Map<String, String> map = EXTRA.get(lang);
            if (map != null) {
                template = map.getOrDefault(english, english);
            }
        }
        for (int i = 0; i < args.length; i++) {
            template = template.replace("{" + i + "}", String.valueOf(args[i]));
        }
        return template;
    }

    /** "1 day" / "3 days" — plural forms differ per language. */
    public static String days(int count) {
        int mod10 = count % 10;
        int mod100 = count % 100;
        boolean slavicFew = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
        return count + switch (lang()) {
            // Croatian: n ending in 1 (except 11) takes the singular ("21 dan").
            case "hr" -> (mod10 == 1 && mod100 != 11) ? " dan" : " dana";
            case "de" -> count == 1 ? " Tag" : " Tage";
            case "es" -> count == 1 ? " día" : " días";
            case "fr" -> count <= 1 ? " jour" : " jours";
            case "it" -> count == 1 ? " giorno" : " giorni";
            case "no" -> count == 1 ? " dag" : " dager";
            case "pl" -> count == 1 ? " dzień" : " dni";
            case "nl" -> count == 1 ? " dag" : " dagen";
            case "sv" -> count == 1 ? " dag" : " dagar";
            case "da" -> count == 1 ? " dag" : " dage";
            case "pt" -> count == 1 ? " dia" : " dias";
            // Romanian: 1 zi; 2–19 zile; ≥20 take "de zile".
            case "ro" -> count == 1 ? " zi" : (count < 20 ? " zile" : " de zile");
            // Czech/Slovak: 1 / 2–4 / 5+ (12–14 fall to the 5+ form).
            case "cs" -> count == 1 ? " den" : (slavicFew ? " dny" : " dní");
            case "sk" -> count == 1 ? " deň" : (slavicFew ? " dni" : " dní");
            case "el" -> count == 1 ? " μέρα" : " μέρες";
            default -> count == 1 ? " day" : " days";
        };
    }

    /** "1 year" / "3 years" — HR: "1 godina" / "2 godine" / "5 godina". */
    public static String years(int count) {
        int mod10 = count % 10;
        int mod100 = count % 100;
        boolean slavicFew = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
        return count + switch (lang()) {
            case "hr" -> (mod10 == 1 && mod100 != 11) ? " godina" : (slavicFew ? " godine" : " godina");
            case "de" -> count == 1 ? " Jahr" : " Jahre";
            case "es" -> count == 1 ? " año" : " años";
            case "fr" -> count <= 1 ? " an" : " ans";
            case "it" -> count == 1 ? " anno" : " anni";
            case "no" -> " år"; // same singular and plural
            case "pl" -> count == 1 ? " rok" : (slavicFew ? " lata" : " lat");
            case "nl" -> " jaar"; // "jaar" stays after a number (3 jaar)
            case "sv" -> " år";
            case "da" -> " år";
            case "pt" -> count == 1 ? " ano" : " anos";
            case "ro" -> count == 1 ? " an" : (count < 20 ? " ani" : " de ani");
            case "cs" -> count == 1 ? " rok" : (slavicFew ? " roky" : " let");
            case "sk" -> count == 1 ? " rok" : (slavicFew ? " roky" : " rokov");
            case "el" -> count == 1 ? " χρόνος" : " χρόνια";
            default -> count == 1 ? " year" : " years";
        };
    }

    /** Localized protein name, lowercase for mid-sentence use ("chicken" / "piletina"). */
    public static String protein(Protein protein) {
        Protein value = protein == null ? Protein.UNKNOWN : protein;
        return switch (lang()) {
            case "hr" -> switch (value) {
                case CHICKEN -> "piletina"; case BEEF -> "govedina"; case LAMB -> "janjetina";
                case SALMON -> "losos"; case TURKEY -> "puretina"; case DUCK -> "pačetina";
                case PORK -> "svinjetina"; case EGG -> "jaja"; case DAIRY -> "mliječni proizvodi";
                case OTHER -> "drugo"; default -> "nepoznato";
            };
            // German common nouns are always capitalised.
            case "de" -> switch (value) {
                case CHICKEN -> "Huhn"; case BEEF -> "Rind"; case LAMB -> "Lamm";
                case SALMON -> "Lachs"; case TURKEY -> "Pute"; case DUCK -> "Ente";
                case PORK -> "Schwein"; case EGG -> "Ei"; case DAIRY -> "Milchprodukte";
                case OTHER -> "Sonstiges"; default -> "Unbekannt";
            };
            case "es" -> switch (value) {
                case CHICKEN -> "pollo"; case BEEF -> "ternera"; case LAMB -> "cordero";
                case SALMON -> "salmón"; case TURKEY -> "pavo"; case DUCK -> "pato";
                case PORK -> "cerdo"; case EGG -> "huevo"; case DAIRY -> "lácteos";
                case OTHER -> "otro"; default -> "desconocido";
            };
            case "fr" -> switch (value) {
                case CHICKEN -> "poulet"; case BEEF -> "bœuf"; case LAMB -> "agneau";
                case SALMON -> "saumon"; case TURKEY -> "dinde"; case DUCK -> "canard";
                case PORK -> "porc"; case EGG -> "œuf"; case DAIRY -> "produits laitiers";
                case OTHER -> "autre"; default -> "inconnu";
            };
            case "it" -> switch (value) {
                case CHICKEN -> "pollo"; case BEEF -> "manzo"; case LAMB -> "agnello";
                case SALMON -> "salmone"; case TURKEY -> "tacchino"; case DUCK -> "anatra";
                case PORK -> "maiale"; case EGG -> "uovo"; case DAIRY -> "latticini";
                case OTHER -> "altro"; default -> "sconosciuto";
            };
            case "no" -> switch (value) {
                case CHICKEN -> "kylling"; case BEEF -> "storfe"; case LAMB -> "lam";
                case SALMON -> "laks"; case TURKEY -> "kalkun"; case DUCK -> "and";
                case PORK -> "svin"; case EGG -> "egg"; case DAIRY -> "meieriprodukter";
                case OTHER -> "annet"; default -> "ukjent";
            };
            case "pl" -> switch (value) {
                case CHICKEN -> "kurczak"; case BEEF -> "wołowina"; case LAMB -> "jagnięcina";
                case SALMON -> "łosoś"; case TURKEY -> "indyk"; case DUCK -> "kaczka";
                case PORK -> "wieprzowina"; case EGG -> "jajko"; case DAIRY -> "nabiał";
                case OTHER -> "inne"; default -> "nieznane";
            };
            case "nl" -> switch (value) {
                case CHICKEN -> "kip"; case BEEF -> "rund"; case LAMB -> "lam";
                case SALMON -> "zalm"; case TURKEY -> "kalkoen"; case DUCK -> "eend";
                case PORK -> "varken"; case EGG -> "ei"; case DAIRY -> "zuivel";
                case OTHER -> "overig"; default -> "onbekend";
            };
            case "sv" -> switch (value) {
                case CHICKEN -> "kyckling"; case BEEF -> "nötkött"; case LAMB -> "lamm";
                case SALMON -> "lax"; case TURKEY -> "kalkon"; case DUCK -> "anka";
                case PORK -> "fläsk"; case EGG -> "ägg"; case DAIRY -> "mejeriprodukter";
                case OTHER -> "annat"; default -> "okänt";
            };
            case "da" -> switch (value) {
                case CHICKEN -> "kylling"; case BEEF -> "oksekød"; case LAMB -> "lam";
                case SALMON -> "laks"; case TURKEY -> "kalkun"; case DUCK -> "and";
                case PORK -> "svinekød"; case EGG -> "æg"; case DAIRY -> "mejeriprodukter";
                case OTHER -> "andet"; default -> "ukendt";
            };
            case "pt" -> switch (value) {
                case CHICKEN -> "frango"; case BEEF -> "vaca"; case LAMB -> "borrego";
                case SALMON -> "salmão"; case TURKEY -> "peru"; case DUCK -> "pato";
                case PORK -> "porco"; case EGG -> "ovo"; case DAIRY -> "laticínios";
                case OTHER -> "outro"; default -> "desconhecido";
            };
            case "ro" -> switch (value) {
                case CHICKEN -> "pui"; case BEEF -> "vită"; case LAMB -> "miel";
                case SALMON -> "somon"; case TURKEY -> "curcan"; case DUCK -> "rață";
                case PORK -> "porc"; case EGG -> "ou"; case DAIRY -> "lactate";
                case OTHER -> "altele"; default -> "necunoscut";
            };
            case "cs" -> switch (value) {
                case CHICKEN -> "kuře"; case BEEF -> "hovězí"; case LAMB -> "jehněčí";
                case SALMON -> "losos"; case TURKEY -> "krůta"; case DUCK -> "kachna";
                case PORK -> "vepřové"; case EGG -> "vejce"; case DAIRY -> "mléčné výrobky";
                case OTHER -> "jiné"; default -> "neznámé";
            };
            case "sk" -> switch (value) {
                case CHICKEN -> "kura"; case BEEF -> "hovädzie"; case LAMB -> "jahňacie";
                case SALMON -> "losos"; case TURKEY -> "morka"; case DUCK -> "kačka";
                case PORK -> "bravčové"; case EGG -> "vajce"; case DAIRY -> "mliečne výrobky";
                case OTHER -> "iné"; default -> "neznáme";
            };
            case "el" -> switch (value) {
                case CHICKEN -> "κοτόπουλο"; case BEEF -> "βοδινό"; case LAMB -> "αρνί";
                case SALMON -> "σολομός"; case TURKEY -> "γαλοπούλα"; case DUCK -> "πάπια";
                case PORK -> "χοιρινό"; case EGG -> "αυγό"; case DAIRY -> "γαλακτοκομικά";
                case OTHER -> "άλλο"; default -> "άγνωστο";
            };
            default -> value.displayName().toLowerCase(Locale.ROOT);
        };
    }

    /** Localized protein name capitalized for labels ("Chicken" / "Piletina"). */
    public static String proteinLabel(Protein protein) {
        String lower = protein(protein);
        return lower.isEmpty() ? lower : Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    // ------------------------------------------------------------------
    // Croatian overrides. English string = key. Keep entries grouped by the
    // service they belong to; fall-through to English is always safe.
    // ------------------------------------------------------------------
    private static final Map<String, String> HR = new HashMap<>();

    private static void put(String en, String hr) {
        HR.put(en, hr);
    }

    static {
        // --- Pattern cards: dog ------------------------------------------------
        put("Scratching is higher than usual",
                "Češanje je izraženije nego inače");
        put("{0} has been scratching more than usual the last few days.",
                "{0} se zadnjih dana češe više nego inače.");
        put("Last 3 days: about {0}/10 for scratching",
                "Zadnja 3 dana: oko {0}/10 za češanje");
        put("Usual lately: about {0}/10",
                "Uobičajeno u zadnje vrijeme: oko {0}/10");
        put("That's roughly +{0} higher than usual",
                "To je otprilike +{0} više nego inače");
        put("Stool has been less stable this week",
                "Stolica je ovaj tjedan manje stabilna");
        put("{0} had softer stool or diarrhea more than once this week.",
                "Mekša stolica ili proljev zabilježeni su više puta ovaj tjedan.");
        put("Recent days reviewed: {0}",
                "Pregledano zadnjih dana: {0}");
        put("Soft stool or diarrhea days: {0}",
                "Dana s mekšom stolicom ili proljevom: {0}");
        put("Worth comparing with recent food changes",
                "Vrijedi usporediti s nedavnim promjenama hrane");
        put("Ear redness keeps coming back",
                "Crvenilo ušiju se ponavlja");
        put("Redness around {0}'s ears was logged on several recent days. Worth keeping track of and mentioning to your vet.",
                "Crvenilo ušiju zabilježeno je više puta zadnjih dana. Vrijedi pratiti i spomenuti veterinaru.");
        put("Days reviewed: {0}",
                "Pregledano dana: {0}");
        put("Days with red or irritated ears: {0}",
                "Dana s crvenim ili nadraženim ušima: {0}");
        put("Sometimes lines up with food or seasonal changes",
                "Ponekad se poklapa s promjenama hrane ili godišnjeg doba");
        put("Water looks lower than usual",
                "Unos vode izgleda manji nego inače");
        put("{0}'s water intake was logged lower than usual recently.",
                "Unos vode zadnjih je dana zabilježen manji nego inače.");
        put("Lower water days: {0}",
                "Dana s manje vode: {0}");
        put("Bring this context to your vet if it continues or appears with other changes",
                "Spomeni to veterinaru ako se nastavi ili se pojavi uz druge promjene");
        put("Possible {0}-related pattern",
                "Mogući obrazac: {0}");
        put("More scratching or stool changes were logged after {0}-based food or treats more than once. Not a diagnosis — could be worth raising with your vet.",
                "Nakon hrane ili poslastica ({0}) više je puta zabilježeno više češanja ili promjena stolice. Nije dijagnoza — vrijedi spomenuti veterinaru.");
        put("Food looked at: {0}",
                "Promatrana hrana: {0}");
        put("Times it lined up after that food: {0}",
                "Koliko se puta poklopilo nakon te hrane: {0}");
        put("Average rise in scratching afterwards: +{0}/10",
                "Prosječan porast češanja nakon toga: +{0}/10");
        put("We looked at days 3–10 after each change",
                "Gledali smo dane 3–10 nakon svake promjene");
        // Clarity pass — plain-language pattern bullets (no analytics)
        put("{0} was logged more than once",
                "Zabilježeno više puta: {0}");
        put("A related change appeared {0} times afterwards",
                "Povezana promjena pojavila se {0} puta nakon toga");
        put("PetPattern reviewed the recent notes",
                "PetPattern je pregledao nedavne zapise");
        put("Scratching was logged higher the last few days",
                "Češanje je zadnjih dana zabilježeno jače");
        put("Higher than what was usual for {0} lately",
                "Više nego što je u zadnje vrijeme uobičajeno za {0}");
        put("Worth mentioning",
                "Vrijedi spomenuti");
        put("You've reached the maximum of {0} pets on one account.",
                "Dosegnuo si najveći broj ljubimaca na jednom računu ({0}).");

        // --- Pattern cards: cat ------------------------------------------------
        put("This is not a diagnosis, but it may be worth discussing with your vet.",
                "Ovo nije dijagnoza, ali može biti vrijedno razgovora s veterinarom.");
        put("Appetite lower than usual",
                "Apetit manji nego inače");
        put("{0}'s appetite has been lower than usual on more than one recent day.",
                "Apetit je zadnjih dana više puta zabilježen manji nego inače.");
        put("Days appetite was lower or refused: {0}",
                "Dana s manjim apetitom ili odbijanjem hrane: {0}");
        put("A lower appetite in cats is worth watching",
                "Manji apetit kod mačke vrijedi pratiti");
        put("Water intake changed from usual",
                "Unos vode promijenjen u odnosu na uobičajeno");
        put("Water intake changed from {0}'s recent normal ({1} than usual).",
                "Unos vode promijenio se u odnosu na nedavno uobičajeno ({1} nego inače).");
        put("lower", "manje");
        put("higher", "više");
        put("Days water was {0} than usual: {1}",
                "Dana kad je vode bilo {0} nego inače: {1}");
        put("Changes in a cat's water intake are worth keeping an eye on",
                "Promjene u unosu vode kod mačke vrijedi pratiti");
        put("Litter box behavior changed recently",
                "Navike s pijeskom nedavno su se promijenile");
        put("{0}'s litter box behavior changed recently.",
                "Korištenje pijeska nedavno se promijenilo.");
        put(" Straining was also noted on at least one day.",
                " Zabilježeno je i naprezanje barem jedan dan.");
        put("Days with a litter box or urination change: {0}",
                "Dana s promjenom pijeska ili mokrenja: {0}");
        put("Litter box changes are worth mentioning to your vet",
                "Promjene oko pijeska vrijedi spomenuti veterinaru");
        put("Hiding logged more than usual",
                "Skrivanje zabilježeno više nego inače");
        put("Hiding was logged more than usual for {0} recently. More hiding in cats is worth watching.",
                "Skrivanje je zadnjih dana zabilježeno više nego inače. Više skrivanja kod mačke vrijedi pratiti.");
        put("Days hiding was logged: {0}",
                "Dana sa zabilježenim skrivanjem: {0}");
        put("Worth watching alongside appetite and litter box",
                "Vrijedi pratiti zajedno s apetitom i pijeskom");
        put("Vomiting logged more than once",
                "Povraćanje zabilježeno više puta");
        put("{0} vomited on more than one recent day.",
                "Povraćanje je zabilježeno više dana u zadnje vrijeme.");
        put("Days vomiting was logged: {0}",
                "Dana sa zabilježenim povraćanjem: {0}");
        put("Worth bringing to your vet if it continues",
                "Vrijedi spomenuti veterinaru ako se nastavi");

        // --- Timeline ("What changed before this?") -----------------------------
        put("PetPattern does not diagnose or replace veterinary care. This is a possible pattern from owner-reported logs, not a medical conclusion.",
                "PetPattern ne postavlja dijagnoze i ne zamjenjuje veterinarsku skrb. Ovo je mogući obrazac iz tvojih unosa, ne medicinski zaključak.");
        put("There is not enough history yet. Keep logging for a few more days.",
                "Još nema dovoljno povijesti. Nastavi bilježiti još nekoliko dana.");
        put("What changed before this?",
                "Što se promijenilo prije ovoga?");
        put("What happened before it?",
                "Što se dogodilo prije toga?");
        put("That is why PetPattern shows this as a possible pattern. Not a diagnosis.",
                "Zato PetPattern ovo prikazuje kao mogući obrazac. Nije dijagnoza.");
        put("PetPattern looks at the days before {0}'s signals changed.",
                "PetPattern gleda dane prije nego što su se znakovi promijenili.");
        put("Started {0}", "Početak: {0}");
        put("Finished {0}", "Kraj: {0}");
        put("A medication or care note was logged.",
                "Zabilježen je lijek ili bilješka o njezi.");
        put("This medication was marked finished.",
                "Ovaj lijek označen je kao završen.");
        put("Scratching increased", "Češanje se pojačalo");
        put("Itching logged at {0}/10, higher than the days before.",
                "Češanje zabilježeno na {0}/10, više nego prethodnih dana.");
        put("Scratching settled", "Češanje se smirilo");
        put("Itching eased back to {0}/10.",
                "Češanje se spustilo na {0}/10.");
        put("Loose stool logged", "Zabilježena rijetka stolica");
        put("Stool became softer", "Stolica je postala mekša");
        put("Diarrhea was recorded on this day.",
                "Tog dana zabilježen je proljev.");
        put("Softer stool than the days before.",
                "Mekša stolica nego prethodnih dana.");
        put("Drinking less than usual", "Pije manje nego inače");
        put("Water intake was logged lower than usual.",
                "Unos vode zabilježen je manji nego inače.");
        put("Ear redness noticed", "Uočeno crvenilo ušiju");
        put("Redness around the ears was logged.",
                "Zabilježeno je crvenilo oko ušiju.");
        put("Vomiting logged", "Zabilježeno povraćanje");
        put("Vomiting was recorded on this day.",
                "Tog dana zabilježeno je povraćanje.");
        put("Your note", "Tvoja bilješka");
        put("This is where the days above start to look like a pattern — a good thing to raise with your vet.",
                "Ovdje dani iznad počinju izgledati kao mogući obrazac — dobro je to spomenuti veterinaru.");
        put("new food", "nova hrana");
        put("Main food", "Glavna hrana");
        put("Treat", "Poslastica");
        put("Supplement", "Dodatak");
        put("Other", "Ostalo");
        put("protein: {0}", "protein: {0}");

        // Timeline owner explanations
        put("In the days after {0} ate the food below, the signals you track changed more than usual, and this happened in more than one tracked period. It is not a diagnosis, but it may be a pattern worth bringing to your vet.",
                "U danima nakon te hrane znakovi koje pratiš promijenili su se više nego inače, i to u više od jednog razdoblja. Nije dijagnoza, ali može biti obrazac koji vrijedi spomenuti veterinaru.");
        put("{0}'s scratching has been higher than the recent normal range. Looking at the days before the rise can help you and your vet spot what changed.",
                "Češanje je bilo iznad nedavnog uobičajenog raspona. Pogled na dane prije porasta može tebi i veterinaru pomoći uočiti što se promijenilo.");
        put("{0}'s stool has been less stable than usual this week. Recent food changes are worth comparing against these days.",
                "Stolica je ovaj tjedan bila manje stabilna nego inače. Nedavne promjene hrane vrijedi usporediti s tim danima.");
        put("{0} has been drinking less than usual. This is context worth watching, especially if it continues or appears with other changes.",
                "{0} pije manje nego inače. To vrijedi pratiti, pogotovo ako se nastavi ili se pojavi uz druge promjene.");
        put("{0}'s ears have been red or irritated on several recent days. Looking at the days around it can help you and your vet see what changed.",
                "Uši su zadnjih dana više puta bile crvene ili nadražene. Pogled na dane oko toga može tebi i veterinaru pomoći vidjeti što se promijenilo.");
        put("{0}'s appetite has been lower than usual recently. Looking at the days around it can help you and your vet see what changed. This is not a diagnosis.",
                "Apetit je u zadnje vrijeme manji nego inače. Pogled na dane oko toga može tebi i veterinaru pomoći vidjeti što se promijenilo. Nije dijagnoza.");
        put("{0}'s water intake changed from the recent normal. Worth watching, especially if it continues or appears with other changes.",
                "Unos vode promijenio se u odnosu na nedavno uobičajeno. Vrijedi pratiti, pogotovo ako se nastavi ili se pojavi uz druge promjene.");
        put("{0}'s litter box behavior changed recently. Looking at the days around it can help you and your vet. This is not a diagnosis.",
                "Navike s pijeskom nedavno su se promijenile. Pogled na dane oko toga može tebi i veterinaru pomoći. Nije dijagnoza.");
        put("{0} has been hiding more than usual — worth watching and mentioning to your vet.",
                "{0} se skriva više nego inače — vrijedi pratiti i spomenuti veterinaru.");
        put("{0} vomited on more than one recent day. Worth bringing to your vet if it continues. This is not a diagnosis.",
                "Povraćanje je zabilježeno više dana u zadnje vrijeme. Vrijedi spomenuti veterinaru ako se nastavi. Nije dijagnoza.");

        // --- Vet summary --------------------------------------------------------
        put("PetPattern does not diagnose or replace veterinary care. This summary is based on owner-reported logs and is meant to help organize observations for a veterinarian.",
                "PetPattern ne postavlja dijagnoze i ne zamjenjuje veterinarsku skrb. Ovaj sažetak temelji se na unosima vlasnika i služi za lakši razgovor s veterinarom.");
        put("{0} was logged on {1} of the last {2} days.",
                "{0}: zabilježeno {1} od zadnjih {2} dana.");
        put(" Average scratching was {0}/10",
                " Prosječno češanje bilo je {0}/10");
        put(", with the most recent week around {0}/10",
                ", a zadnji tjedan oko {0}/10");
        put(" Ear redness was noted on {0}.",
                " Crvenilo ušiju zabilježeno je {0}.");
        put(" Paw licking was noted on {0}.",
                " Lizanje šapa zabilježeno je {0}.");
        put(" Vomiting was noted on {0}.",
                " Povraćanje je zabilježeno {0}.");
        put("Stool stayed mostly normal across the logged days.",
                "Stolica je kroz zabilježene dane uglavnom bila normalna.");
        put("{0} had softer stool on {1} and loose stool or diarrhea on {2} in this period.",
                "U ovom razdoblju mekša stolica zabilježena je {1}, a rijetka stolica ili proljev {2}.");
        put("used the litter box less or more than usual on {0}",
                "pijesak korišten manje ili više nego inače: {0}");
        put("did not use the litter box on {0}",
                "pijesak nije korišten: {0}");
        put("had a noticed urination change on {0}",
                "primijećena promjena mokrenja: {0}");
        put("strained on {0}",
                "naprezanje: {0}");
        put("hid more than usual on {0}",
                "skrivanje više nego inače: {0}");
        put("had a weight concern noted on {0}",
                "zabilježena zabrinutost za težinu: {0}");
        put("{0} {1} in this period.",
                "U ovom razdoblju: {1}.");
        put("{0} {1}.",
                "U ovom razdoblju: {1}.");
        put("Litter box use and behavior stayed close to usual across the logged days.",
                "Korištenje pijeska i ponašanje bili su blizu uobičajenog kroz zabilježene dane.");
        put("drank less than usual on {0}",
                "manje vode nego inače: {0}");
        put("ate less than usual on {0}",
                "manji apetit nego inače: {0}");
        put("had low or restless energy on {0}",
                "niska ili nemirna energija: {0}");
        put("Water, appetite, and energy stayed close to normal in this period.",
                "Voda, apetit i energija bili su blizu uobičajenog u ovom razdoblju.");
        put("Possible food-related pattern: more itching and stool changes were logged after certain foods. The owner would like to review this with a vet.",
                "Mogući obrazac povezan s hranom: nakon određene hrane zabilježeno je više češanja i promjena stolice. Vlasnik bi to želio proći s veterinarom.");
        put("Recurring scratching above {0}'s normal range that the owner wants to understand.",
                "Ponavljano češanje iznad uobičajenog raspona koje vlasnik želi bolje razumjeti.");
        put("Recurring soft stool or diarrhea that the owner wants to review.",
                "Ponavljana mekša stolica ili proljev koje vlasnik želi proći s veterinarom.");
        put("A recent drop in water intake the owner wants to check.",
                "Nedavno smanjen unos vode koji vlasnik želi provjeriti.");
        put("Recurring ear redness that the owner wants to review.",
                "Ponavljano crvenilo ušiju koje vlasnik želi proći s veterinarom.");
        put("{0}'s appetite has been lower than usual, which the owner wants to review.",
                "Apetit je u zadnje vrijeme manji nego inače, što vlasnik želi proći s veterinarom.");
        put("A recent change in water intake from {0}'s normal that the owner wants to check.",
                "Nedavna promjena unosa vode u odnosu na uobičajeno koju vlasnik želi provjeriti.");
        put("A recent change in litter box behavior that the owner wants to review.",
                "Nedavna promjena navika s pijeskom koju vlasnik želi proći s veterinarom.");
        put("{0} has been hiding more than usual, which the owner wants to review.",
                "Skrivanje je u zadnje vrijeme češće nego inače, što vlasnik želi proći s veterinarom.");
        put("{0} vomited on more than one recent day, which the owner wants to review.",
                "Povraćanje je zabilježeno više dana, što vlasnik želi proći s veterinarom.");
        put("Some itching and stool changes the owner is tracking; no single clear pattern yet.",
                "Nešto češanja i promjena stolice koje vlasnik prati; još nema jednog jasnog obrasca.");
        put("Nothing specific stood out yet. The owner is keeping a daily record so any change is easy to catch early and bring to you.",
                "Ništa specifično još se nije istaknulo. Vlasnik vodi dnevni zapis kako bi se svaka promjena lakše uočila i donijela na pregled.");
        put("PetPattern — Vet Visit Summary", "PetPattern — Sažetak za posjet veterinaru");
        put("Generated {0}", "Izrađeno {0}");
        put("PET", "LJUBIMAC");
        put("DATE RANGE", "RASPON DATUMA");
        put("{0} to {1} ({2} days)", "{0} do {1} ({2} d.)");
        put("OWNER-OBSERVED CONCERN", "ZAPAŽANJE VLASNIKA");
        put("RECENT CHECK-IN SUMMARY", "SAŽETAK NEDAVNIH UNOSA");
        put("FOOD EXPOSURE HISTORY", "POVIJEST HRANE");
        put("No food changes logged in this period.",
                "U ovom razdoblju nema zabilježenih promjena hrane.");
        put("MEDICATIONS & CARE NOTES", "LIJEKOVI I BILJEŠKE O NJEZI");
        put("None logged in this period.", "Ništa zabilježeno u ovom razdoblju.");
        put("ongoing", "u tijeku");
        put("LITTER BOX & BEHAVIOR", "PIJESAK I PONAŠANJE");
        put("Litter box changed", "Promjena pijeska");
        put("Not used", "Nije korišten");
        put("Urination change", "Promjena mokrenja");
        put("Straining", "Naprezanje");
        put("Hiding more", "Više skrivanja");
        put("Weight concern", "Zabrinutost za težinu");
        put("STOOL CHANGES", "PROMJENE STOLICE");
        put("Normal", "Normalno");
        put("Soft", "Mekano");
        put("Loose/diarrhea", "Rijetka/proljev");
        put("WATER / APPETITE / ENERGY", "VODA / APETIT / ENERGIJA");
        put("POSSIBLE PATTERNS", "MOGUĆI OBRASCI");
        put("No single clear pattern stood out in this period.",
                "U ovom razdoblju nije se istaknuo nijedan jasan obrazac.");
        put("NOTES WORTH DISCUSSING", "BILJEŠKE VRIJEDNE RAZGOVORA");
        put("No free-text notes in this period.",
                "Nema slobodnih bilješki u ovom razdoblju.");
        put("DISCLAIMER", "NAPOMENA");
        put("High", "Visoka");
        put("Medium", "Srednja");
        put("Low", "Niska");
        put("Male", "Mužjak");
        put("Female", "Ženka");
        put("Under 1 year", "Manje od 1 godine");
        put("Dog", "Pas");
        put("Cat", "Mačka");
        // Starter-species names for the vet-summary identity line (titleCase(enum)).
        put("Rabbit", "Zec");
        put("Hamster", "Hrčak");
        put("Guinea pig", "Zamorac");
        put("Bird", "Ptica");
        put("Reptile", "Gmaz");
        put("Turtle", "Kornjača");
        put("Fish aquarium", "Riba / akvarij");
        put("Other small pet", "Drugi mali ljubimac");

        // --- Vet summary: multi-species observations + visible change -----------
        put("A recurring change the owner logged that they want to review.",
                "Ponavljana promjena koju je vlasnik zabilježio i želi proći s veterinarom.");
        put("{0} had species-specific changes the owner logged in this period. "
                + "These are owner-observed notes, not a diagnosis.",
                "U ovom razdoblju zabilježene su promjene specifične za vrstu. "
                + "Ovo su zapažanja vlasnika, nije dijagnoza.");
        put("{0} visible-change photo(s) were saved in this period. Track how a change looks "
                + "over time — useful for your vet conversation, not a diagnosis.",
                "U ovom razdoblju spremljene su fotografije vidljive promjene: {0}. Prati kako promjena "
                + "izgleda kroz vrijeme — korisno za razgovor s veterinarom, nije dijagnoza.");
        put("The owner logged {0} visible-change note(s) in this period. This is a timeline of "
                + "how things looked over time, not a diagnosis.",
                "Vlasnik je u ovom razdoblju zabilježio bilješke o vidljivoj promjeni: {0}. Ovo je "
                + "vremenska crta kako je to izgledalo kroz vrijeme, nije dijagnoza.");
        put("SPECIES-SPECIFIC OBSERVATIONS", "ZAPAŽANJA SPECIFIČNA ZA VRSTU");
        put("No species-specific observations logged in this period.",
                "U ovom razdoblju nema zabilježenih zapažanja specifičnih za vrstu.");
        put("logged as changed on {0}", "zabilježena promjena: {0}");
        put("latest", "zadnje");
        put("VISIBLE CHANGES OVER TIME", "VIDLJIVE PROMJENE KROZ VRIJEME");
        put("{0} photo(s)", "{0} fotografija");
        put("Better", "Bolje");
        put("Same", "Isto");
        put("Worse", "Gore");

        // --- Recap --------------------------------------------------------------
        put("Still early — a few more days logged and {0}'s picture fills in.",
                "Još je rano — nekoliko zabilježenih dana i slika će se popuniti.");
        put("A calmer few weeks for {0}.",
                "Mirnije razdoblje za {0}.");
        put("A rougher stretch for {0} — good that it's all written down.",
                "Teže razdoblje za {0} — dobro je da je sve zapisano.");
        put("A steady few weeks for {0}.",
                "Stabilno razdoblje za {0}.");
        put("Tracking since {0}", "Praćenje od: {0}");
        put("The record goes back to your first check-in.",
                "Zapis seže do tvog prvog unosa.");
        put("100+ days logged", "100+ zabilježenih dana");
        put("{0} days of {1}'s history.",
                "Dana povijesti za {1}: {0}.");
        put("A full month tracked", "Cijeli mjesec praćenja");
        put("{0} days logged so far.", "Zabilježenih dana dosad: {0}.");
        put("First week logged", "Prvi zabilježeni tjedan");
        put("Spotted a possible pattern", "Uočen mogući obrazac");
        put("Worth keeping an eye on, and bringing to your vet.",
                "Vrijedi pratiti i spomenuti veterinaru.");
        put("Ran a food trial", "Proveden pokus s hranom");
        put("Took an ingredient out to see if it made a difference.",
                "Jedan sastojak izbačen je da se vidi mijenja li se išta.");
        put("Started a photo record", "Započet foto-zapis");
        put("A visual history to compare over time.",
                "Vizualna povijest za usporedbu kroz vrijeme.");

        // --- Today (overview) ----------------------------------------------------
        put("Start with one quick check-in so PetPattern can begin learning what normal looks like for {0}.",
                "Počni s jednim kratkim unosom da PetPattern počne učiti što je normalno za {0}.");
        put("{0} has history, but today has not been logged yet.",
                "{0} ima povijest, ali današnji dan još nije zabilježen.");
        put("{0} looks close to the recent normal range from the latest log.",
                "{0} prema zadnjem unosu izgleda blizu nedavnog uobičajenog raspona.");
        put("{0} has a recent change worth keeping an eye on.",
                "{0} ima nedavnu promjenu koju vrijedi pratiti.");
        put("Log today", "Zabilježi danas");
        put("Show what changed", "Pokaži što se promijenilo");
        put("Keep tracking", "Nastavi pratiti");
        put("{0}'s scratching has eased off this week.",
                "Češanje se ovaj tjedan smirilo.");
        put("{0}'s stool has settled — a calmer week so far.",
                "Stolica se smirila — mirniji tjedan zasad.");
        put("today", "danas");
        put("yesterday", "jučer");
        put("{0} days ago", "prije {0} dana");
        put("New {0} started {1} — the next few days are the ones to watch for any change in stool or scratching.",
                "{0} od {1} — sljedećih nekoliko dana vrijedi pratiti promjene stolice ili češanja.");
        put("New {0} started {1} — the next few days are worth watching for any change in appetite, litter box or energy.",
                "{0} od {1} — sljedećih nekoliko dana vrijedi pratiti promjene apetita, pijeska ili energije.");
        put("{0} treats", "Nove poslastice ({0})");
        put("{0} food", "Nova hrana ({0})");
        put("treats", "Nove poslastice");
        put("food", "Nova hrana");

        // --- Food trial -----------------------------------------------------------
        put("Not enough logged days yet to compare — keep logging through the trial.",
                "Još nema dovoljno zabilježenih dana za usporedbu — nastavi bilježiti tijekom pokusa.");
        put("Scratching eased while {0} was out, and was logged higher again after it came back. Worth raising with your vet.",
                "Češanje se smirilo u razdoblju bez te hrane, a ponovno se pojačalo nakon što se vratila. Vrijedi spomenuti veterinaru.");
        put("Scratching was noticeably lower while {0} was out of the bowl.",
                "Češanje je bilo primjetno manje u razdoblju bez te hrane.");
        put("Scratching was logged a bit higher while {0} was out — worth mentioning to your vet when you talk this through.",
                "Češanje je u razdoblju bez te hrane bilo nešto izraženije — vrijedi spomenuti veterinaru.");
        put("No clear change while {0} was out — good context to bring to your vet.",
                "Nema jasne promjene u razdoblju bez te hrane — koristan podatak za razgovor s veterinarom.");
        put("Stopped early", "Prekinut ranije");
        put("Wrapped up", "Završen");
        put("Watching after bringing {0} back",
                "Praćenje nakon povratka hrane ({0})");
        put("Starts {0}", "Počinje {0}");
        put("Day {0} of {1} — {2} out of the bowl",
                "Dan {0} od {1} — bez ove hrane ({2})");
        put("Elimination window done — bring {0} back, or wrap up",
                "Razdoblje izbacivanja je gotovo — vrati hranu ({0}) ili završi");
        put("Day {0} of {1} — {2} left out",
                "Dan {0} od {1} — bez ove hrane ({2})");
        put("Tracking window done — bring {0} back, or wrap up",
                "Razdoblje praćenja je gotovo — vrati hranu ({0}) ili završi");

        // --- Insights (secondary surface) -----------------------------------------
        put("This is not a medical conclusion. It is a pattern from stored history that may be useful to discuss with a veterinarian.",
                "Ovo nije medicinski zaključak. To je obrazac iz pohranjene povijesti koji može biti koristan za razgovor s veterinarom.");
        put("PetPattern is still learning what normal looks like",
                "PetPattern još uči što je normalno");
        put("{0} has {1} logged days. Keep tracking food and daily signals so changes become easier to compare.",
                "Zabilježenih dana za {0}: {1}. Nastavi pratiti hranu i dnevne znakove kako bi se promjene lakše usporedile.");
        put("Logged days: {0}", "Zabilježenih dana: {0}");
        put("Nothing outside the usual range yet",
                "Zasad ništa izvan uobičajenog raspona");

        // --- Weekly insight (Today dashboard) -----------------------------------
        put("THIS WEEK", "OVAJ TJEDAN");
        put("Still getting to know {0}'s rhythm", "Još upoznajemo {0}ov ritam");
        put("A few short notes will help useful patterns start to show.",
                "Nekoliko kratkih bilješki pomoći će da se počnu pojavljivati korisni obrasci.");
        put("This week looks fairly steady", "Ovaj tjedan izgleda prilično stabilno");
        put("We didn't spot a big change in the logged routines and behaviour.",
                "Nismo primijetili veću promjenu u zabilježenim rutinama i ponašanju.");
        put("{0} scratched more often this week than last week.",
                "{0} se ovaj tjedan češće češao nego prošli tjedan.");
        put("It may be worth keeping an eye on — nothing conclusive on its own.",
                "Možda vrijedi pratiti — ništa samo po sebi nije zaključak.");
        put("{0} seemed calmer this week — less scratching than last week.",
                "{0} je ovaj tjedan djelovao mirnije — manje češanja nego prošli tjedan.");
        put("A quieter stretch. Worth noting what's been the same lately.",
                "Mirniji period. Vrijedi zabilježiti što je u zadnje vrijeme ostalo isto.");
        put("{0}: {1} came up more often this week.",
                "{0}: {1} se ovaj tjedan češće bilježi.");
        put("{0}: {1} eased off this week.",
                "{0}: {1} se ovaj tjedan smirilo.");
        put("Noted on {0} of {1} days, vs {2} days last week.",
                "Zabilježeno {0} od {1} dana, u odnosu na {2} dana prošli tjedan.");
        put("Just something the notes surfaced — worth keeping in view.",
                "Nešto što su bilješke istaknule — vrijedi imati na oku.");
        put("ear redness", "crvenilo u ušima");
        put("paw licking", "lizanje šapa");
        put("vomiting", "povraćanje");
        put("loose stool", "mekana stolica");
        put("a change", "promjena");
        put("Scratching is logged more often on walk days or the day after.",
                "Češanje se češće bilježi na dan šetnje ili sljedeći dan.");
        put("Scratching is logged more often around activity days.",
                "Češanje se češće bilježi na dane s aktivnošću ili sljedeći dan.");
        put("It's a co-occurrence, not a cause — but it's worth keeping an eye on.",
                "Radi se o istodobnoj pojavi, ne o uzroku — ali vrijedi pratiti.");
        put("Seen on {0} of the last {1} days linked to a walk.",
                "Zabilježeno je u {0} od posljednja {1} dana povezana sa šetnjom.");
        put("Seen on {0} of the last {1} days linked to an activity.",
                "Zabilježeno je u {0} od posljednja {1} dana povezana s aktivnošću.");

        // --- AI note reader ---------------------------------------------------------
        put("Suggestions are temporarily unavailable. Please fill in the fields yourself.",
                "Prijedlozi su privremeno nedostupni. Ispuni polja ručno.");
        put("These are quick guesses from your note — review before saving.",
                "Ovo su brzi prijedlozi iz tvoje bilješke — provjeri prije spremanja.");
        put("The note was empty, so no fields could be suggested.",
                "Bilješka je prazna, pa nije bilo moguće predložiti polja.");
        put("Could not confidently read any fields from this note. Please fill them in yourself.",
                "Iz ove bilješke nije bilo moguće pouzdano iščitati polja. Ispuni ih ručno.");
        put("The note was short, so review the suggestions carefully.",
                "Bilješka je kratka, pa pažljivo provjeri prijedloge.");

        // --- Common errors (the ones the UI surfaces) --------------------------------
        put("Please sign in", "Prijavi se");
        put("Not signed in", "Prijavi se");
        put("Pet not found", "Ljubimac nije pronađen");
        put("Email or password is incorrect", "Email ili lozinka nisu točni");
        put("An account with that email already exists", "Račun s tim emailom već postoji");
        put("Enter a valid email", "Unesi ispravan email");
        put("Password must be at least 8 characters", "Lozinka mora imati najmanje 8 znakova");
        put("That name is too long", "To ime je predugačko");
        put("Please accept the terms and privacy policy to continue",
                "Prihvati uvjete i pravila privatnosti za nastavak");
        put("A check-in can't be in the future", "Unos ne može biti u budućnosti");

        // --- Password reset (endpoint messages + email) ------------------------------
        put("If an account exists for that email, we've sent reset instructions.",
                "Ako za taj email postoji račun, poslali smo upute za promjenu lozinke.");
        put("Your password has been updated. You can sign in now.",
                "Lozinka je promijenjena. Sad se možeš prijaviti.");
        put("This reset link is invalid or has expired. Request a new one.",
                "Ova poveznica nije važeća ili je istekla. Zatraži novu.");
        put("Reset your PetPattern password", "Promjena lozinke za PetPattern");
        put("A password reset was requested for your PetPattern account.\n\n"
                        + "Open this link to choose a new password (valid for 1 hour):\n{0}\n\n"
                        + "If you don't recognise this request, you can ignore this email — "
                        + "your password stays the same.",
                "Zatražena je promjena lozinke za tvoj PetPattern račun.\n\n"
                        + "Otvori ovu poveznicu da postaviš novu lozinku (vrijedi 1 sat):\n{0}\n\n"
                        + "Ako ovaj zahtjev ne prepoznaješ, slobodno zanemari ovu poruku — "
                        + "lozinka ostaje nepromijenjena.");

        // --- Activity logging ---
        put("An activity type is required", "Vrsta aktivnosti je obavezna");
        put("An activity can't be in the future", "Aktivnost ne može biti u budućnosti");
        put("Activity not found", "Aktivnost nije pronađena");
    }
}
