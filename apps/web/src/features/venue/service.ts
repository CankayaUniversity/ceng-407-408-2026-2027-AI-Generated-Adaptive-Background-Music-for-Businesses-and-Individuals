/**
 * The venue profile service the UI uses. Swap the mock for the real
 * implementation here; nothing else in the web app needs to change.
 */

import {mockVenueService} from './mockVenueService';
import type {VenueProfileService} from './types';

export const venueService: VenueProfileService = mockVenueService;
