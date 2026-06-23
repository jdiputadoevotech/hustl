/** Gig categories offered on Hustl. Used by the post/edit forms and browse filter. */
export const GIG_CATEGORIES = [
  "Web Development",
  "Graphic Design",
  "Writing & Translation",
  "Video & Animation",
  "Tutoring",
  "Photography",
  "Digital Marketing",
  "Other",
] as const;

export type GigCategory = (typeof GIG_CATEGORIES)[number];
