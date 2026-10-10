import { z } from "zod";
import { DRAFT_DOOR_TYPES } from "./draft";

/**
 * What Claude must return: the WardrobeDraft shape with every field present
 * (null when unknown). parseDraft and the planner still validate it all, so
 * this schema only fixes the shape, not the rules.
 */
export const draftOutputSchema = z.object({
  recognized: z.boolean(),
  widthCm: z.number().nullable(),
  heightCm: z.number().nullable(),
  depthCm: z.number().nullable(),
  aspectRatio: z.number().nullable(),
  base: z.boolean().nullable(),
  slidingDoors: z.boolean().nullable(),
  sections: z.array(
    z.object({
      widthRatio: z.number().nullable(),
      shelves: z.array(z.number()),
      drawers: z.number().nullable(),
      rod: z.boolean(),
      rodHeight: z.number().nullable(),
      door: z.enum(DRAFT_DOOR_TYPES),
    }),
  ),
});

export const SYSTEM_PROMPT = `You read a photo or a hand-drawn sketch of a wardrobe, or a customer's written description of one, and describe its front layout for a wardrobe configurator. The configurator builds a real, manufacturable wardrobe from your description and fixes anything that breaks its rules, so describe what the customer shows or asks for rather than what you think is buildable.

recognized: true when the image shows a wardrobe, closet, cabinet or shelving unit, or a drawing of one, even a very rough one. Otherwise false, with sections empty and the other fields null.

Dimensions (widthCm, heightCm, depthCm): only when a number is written on the image or clearly labelled. Convert mm or m to cm. Never estimate dimensions from how a photo looks.

aspectRatio: width divided by height of the outer outline, as drawn or photographed from the front. Give it even for rough sketches.

sections: the vertical compartments from left to right, separated by full-height vertical panels or lines.
- widthRatio: the section's width relative to the others (for example 1, 1, 1.3).
- shelves: every horizontal shelf or line inside that section, as its height above the floor divided by the total height (0 = bottom, 1 = top). Leave out the top and bottom panels and the lines between drawer fronts.
- drawers: how many drawers are stacked at the bottom of the section, 0 if none.
- rod: true when a hanging rail or clothes on hangers are shown; rodHeight is the rail's height as the same fraction.
- door: the door covering the section. "left" is hinged on the left (handle on the right), "right" is hinged on the right, "double" is a pair of doors, the Mirror variants are mirrored doors, "none" is open.

For a closed wardrobe where only doors are visible, treat each pair of doors as one section with "double" and each single door as its own section; leave shelves empty because the interior is hidden.

base: true when a plinth or base is visible under the wardrobe. slidingDoors: true when the doors are sliding panels on rails rather than hinged.

Photos of a real wardrobe or shelving unit: read its front face even when the photo is taken at an angle. Full-height side and divider panels make the sections; horizontal boards are shelves. Things stored inside (clothes, boxes, books) are not furniture, except that clothes on hangers mean a hanging rail. Ignore the room, walls and other furniture.

Sketches may be on paper, a napkin or a whiteboard, photographed at an angle. Sketches are rough: read the intent. A rectangle split by a cross is two sections, each with one shelf halfway up. Ignore perspective and describe the front view. Labels may be in Serbian: fioka/fioke = drawer(s), polica/police = shelf/shelves, šipka = hanging rail, vrata = doors, klizna = sliding, ogledalo = mirror, širina/visina/dubina = width/height/depth.

Written descriptions: instead of an image, or next to one, you may get the customer's own words in Serbian (Latin or Cyrillic) or English. Read them with the same rules.
- recognized: true when the text asks for a wardrobe, closet, cabinet or shelving unit; false for anything else.
- Dimensions written in the text count as written on the image. Labels decide (širina/width, visina/height, dubina/depth). Unlabelled "A × B × C" is width × height × depth. With only two unlabelled numbers, one of 100 cm or less is the depth and the other the width.
- Sections are what the customer calls kolone, delovi or pregrade, counted from the left (prva/first, druga/second, treća/third…). A width per section in cm gives the widthRatio; without widths, sections are equal.
- A number of shelves without heights means evenly spaced shelves; leave room for drawers below them in the same section.
- A section the text says nothing about gets no shelves, no drawers and no rail.
- Doors: krilna/hinged on one section is "left" unless a side is given, dvokrilna/double is "double", klizna/sliding sets slidingDoors, bez vrata/open is "none". When doors aren't mentioned, use "none".
- aspectRatio is null unless both width and height are given.
- When an image and a description disagree, the description wins: it is the customer's own correction.

Do not invent details the image or the text does not give.`;
