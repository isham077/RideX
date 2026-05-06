import { Ride, User } from "../types";

/**
 * AI-Based Pricing Logic
 * Recommended Price = distance × 6.5
 */
export function calculateRecommendedPrice(distance: number): number {
  return Math.round(distance * 6.5 * 100) / 100;
}

/**
 * Trust Score Calculation
 * trustScore = (rating × 0.5) + (completionRate × 0.3) + (reliability × 0.2)
 * Normalized to 0-100
 */
export function calculateTrustScore(rating: number, completionRate: number, reliability: number): number {
  // rating is 1-5, so we scale it to 0-100
  const normalizedRating = (rating / 5) * 100;
  const score = (normalizedRating * 0.5) + (completionRate * 0.3) + (reliability * 0.2);
  return Math.round(score);
}

export function getTrustBadge(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Excellent", color: "text-emerald-400" };
  if (score >= 75) return { label: "Good", color: "text-blue-400" };
  if (score >= 50) return { label: "Average", color: "text-yellow-400" };
  return { label: "Poor", color: "text-red-400" };
}

/**
 * Eco Impact Calculation
 * CO2 saved = distance × 0.12 (kg)
 */
export function calculateEcoImpact(distance: number): number {
  return Math.round(distance * 0.12 * 100) / 100;
}
