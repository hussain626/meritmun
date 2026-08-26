/**
 * Public sponsor slate. Admin CMS (`sponsors` table) replaces this when
 * Supabase is connected; until then the home slider reads these entries.
 */

export type PublicSponsor = {
  id: string;
  name: string;
  logoUrl: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
};

export const sponsors: PublicSponsor[] = [
  {
    id: "sponsor-habib",
    name: "Habib Metro",
    logoUrl: "",
    url: "https://www.habibmetro.com",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "sponsor-engro",
    name: "Engro Foundation",
    logoUrl: "",
    url: "https://www.engro.com",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "sponsor-jazz",
    name: "Jazz",
    logoUrl: "",
    url: "https://www.jazz.com.pk",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "sponsor-unilever",
    name: "Unilever Pakistan",
    logoUrl: "",
    url: "https://www.unilever.pk",
    sortOrder: 4,
    isActive: true,
  },
];
