"""Guard against prompts that name real artists, bands or copyrighted works.

ElevenLabs refuses such prompts (``bad_prompt``). Catching the obvious cases while the plan is
still being validated lets the LLM client's repair retry fix them before a track is generated.

This is a guard, not a complete filter. It knows a short list of well-known names and a few
phrases that point at somebody else's work, so it misses lesser-known names, misspellings and
indirect references. A phrase such as "like Radiohead" is caught because the name is on the list,
not because of the word "like": a generic "like <Capitalised word>" pattern would also reject
harmless text such as "like Sunday morning". ElevenLabs stays the final judge, and the generation
service retries once with the suggestion it returns.
"""

import re
import unicodedata

BLOCKED_ARTISTS: tuple[str, ...] = (
    "AC/DC",
    "ABBA",
    "Adele",
    "Aphex Twin",
    "Ariana Grande",
    "Arctic Monkeys",
    "Billie Eilish",
    "Bob Dylan",
    "Bob Marley",
    "Bruno Mars",
    "Beyonce",
    "Black Sabbath",
    "Britney Spears",
    "Bruce Springsteen",
    "Coldplay",
    "Daft Punk",
    "David Bowie",
    "Depeche Mode",
    "Dua Lipa",
    "Ed Sheeran",
    "Eminem",
    "Elton John",
    "Elvis Presley",
    "Fleetwood Mac",
    "Foo Fighters",
    "Frank Sinatra",
    "Guns N' Roses",
    "Hans Zimmer",
    "Imagine Dragons",
    "Jay-Z",
    "John Coltrane",
    "Joe Hisaishi",
    "Justin Bieber",
    "Kanye West",
    "Kraftwerk",
    "Lady Gaga",
    "Lana Del Rey",
    "Led Zeppelin",
    "Linkin Park",
    "Ludovico Einaudi",
    "Madonna",
    "Metallica",
    "Michael Jackson",
    "Miles Davis",
    "Pink Floyd",
    "Post Malone",
    "Radiohead",
    "Red Hot Chili Peppers",
    "Rihanna",
    "Taylor Swift",
    "Tame Impala",
    "The Beatles",
    "Beatles",
    "The Rolling Stones",
    "Rolling Stones",
    "The Weeknd",
    "U2",
    "Vangelis",
    "Harry Potter",
    "Game of Thrones",
    "Star Wars",
    "Studio Ghibli",
    "Super Mario",
    "Pokemon",
    "Final Fantasy",
    "The Legend of Zelda",
)

BLOCKED_PHRASES: tuple[str, ...] = (
    "in the style of",
    "in the vein of",
    "sounds like",
    "sound like",
    "reminiscent of",
)


def _normalise(text: str) -> str:
    """Lowercase, drop accents and unify apostrophes so "Beyoncé" matches "Beyonce"."""
    decomposed = unicodedata.normalize("NFKD", text.replace("\u2019", "'"))
    return "".join(c for c in decomposed if not unicodedata.combining(c)).casefold()


def _pattern(items: tuple[str, ...]) -> re.Pattern[str]:
    parts = (r"\s+".join(re.escape(word) for word in _normalise(item).split()) for item in items)
    return re.compile(r"(?<!\w)(?:" + "|".join(parts) + r")(?!\w)")


_ARTIST_PATTERN = _pattern(BLOCKED_ARTISTS)
_PHRASE_PATTERN = _pattern(BLOCKED_PHRASES)


def find_reference(text: str) -> str | None:
    """Return the first blocked artist name or phrase found in ``text``, else ``None``."""
    normalised = _normalise(text)
    match = _PHRASE_PATTERN.search(normalised) or _ARTIST_PATTERN.search(normalised)
    return match.group(0) if match else None
