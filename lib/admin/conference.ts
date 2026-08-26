/**
 * Singleton conference settings (registration open/closed).
 */

export type ConferenceSettings = {
  id: number;
  registrationOpen: boolean;
  updatedAt: string;
  updatedBy: string | null;
};

export const DEFAULT_CONFERENCE_SETTINGS: ConferenceSettings = {
  id: 1,
  registrationOpen: false,
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
};
