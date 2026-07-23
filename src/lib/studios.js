// Streaming brand / studio definitions used for the homepage logo strip and the
// per-studio browse page. Each `embyStudios` list maps the brand to every Emby
// Studio / network name that should count toward it (Emby accepts a
// comma-separated Studios= filter, so all aliases are matched at once).

export const STUDIOS = [
  {
    slug: 'netflix',
    name: 'Netflix',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    bg: '#000000',
    embyStudios: ['Netflix'],
  },
  {
    slug: 'disney',
    name: 'Disney',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
    bg: '#0c0f2b',
    embyStudios: [
      'Walt Disney Pictures',
      'Walt Disney Animation Studios',
      'Walt Disney Studios',
      'Pixar',
      'Pixar Animation Studios',
      'Disney+',
      'Disney Channel',
      'Disney Television Animation',
    ],
  },
  {
    slug: 'marvel',
    name: 'Marvel',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Marvel_Logo.svg',
    bg: '#ed1d24',
    embyStudios: ['Marvel Studios', 'Marvel Entertainment', 'Marvel Television'],
  },
  {
    slug: 'hbo',
    name: 'HBO Max',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg',
    bg: '#000000',
    embyStudios: ['HBO', 'HBO Max', 'Max', 'Home Box Office'],
  },
  {
    slug: 'apple',
    name: 'Apple TV+',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg',
    bg: '#000000',
    embyStudios: ['Apple TV+', 'Apple TV Plus', 'Apple Studios', 'Apple'],
  },
  {
    slug: 'paramount',
    name: 'Paramount+',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg',
    bg: '#0064ff',
    embyStudios: [
      'Paramount+',
      'Paramount Plus',
      'Paramount Pictures',
      'Paramount',
      'Paramount Television',
      'CBS',
      'CBS Studios',
    ],
  },
  {
    slug: 'hulu',
    name: 'Hulu',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg',
    bg: '#000000',
    embyStudios: ['Hulu', 'Hulu Originals'],
  },
  {
    slug: 'prime',
    name: 'Prime Video',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg',
    bg: '#00050d',
    embyStudios: ['Amazon', 'Amazon Studios', 'Prime Video', 'Amazon Prime Video', 'Amazon MGM Studios'],
  },
  {
    slug: 'universal',
    name: 'Universal',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Universal_Pictures_logo.svg',
    bg: '#00061a',
    embyStudios: ['Universal Pictures', 'Universal', 'Universal Studios', 'Focus Features'],
  },
  {
    slug: 'warner',
    name: 'Warner Bros.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Warner_Bros._logo.svg',
    bg: '#04123b',
    embyStudios: ['Warner Bros. Pictures', 'Warner Bros.', 'Warner Bros. Television', 'New Line Cinema'],
  },
  {
    slug: 'sony',
    name: 'Sony',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Columbia_Pictures_logo.svg',
    bg: '#000000',
    embyStudios: ['Columbia Pictures', 'Sony Pictures', 'Sony Pictures Entertainment', 'TriStar Pictures'],
  },
  {
    slug: 'lionsgate',
    name: 'Lionsgate',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Lionsgate.svg',
    bg: '#000000',
    embyStudios: ['Lionsgate', 'Lions Gate Films', 'Lionsgate Television'],
  },
];

export function getStudioBySlug(slug) {
  return STUDIOS.find(s => s.slug === slug) || null;
}