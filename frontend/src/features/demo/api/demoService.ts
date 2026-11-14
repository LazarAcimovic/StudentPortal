import axiosClient from "../../../shared/api/axiosClient";
import { API_ROUTES } from "../../../config/constants";

/**
 * Probes whether this deployment has demo mode on.
 *
 * Resolves on 200 and rejects on anything else — including the 404 that every
 * non-demo deployment returns, because the routes are not mapped there at all
 * (per D-049). Callers treat a rejection as "hide the button"; the service stays
 * dumb and does not swallow the error itself.
 */
export const getDemoStatus = async (signal?: AbortSignal): Promise<void> => {
  await axiosClient.get(API_ROUTES.DEMO_STATUS, { signal });
};

/**
 * Replays the three SQL fixtures on the server, discarding every change visitors
 * have made. Rejects with 409 when a reset is already running.
 */
export const resetDemoData = async (signal?: AbortSignal): Promise<void> => {
  await axiosClient.post(API_ROUTES.DEMO_RESET, null, { signal });
};
