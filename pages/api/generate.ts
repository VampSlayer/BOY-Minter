import type { NextApiRequest, NextApiResponse } from "next";

import mergeImages from "merge-images";

import { Canvas, Image } from "canvas";

import Jimp from "jimp";

import objectHash from "object-hash";

import { join } from "path";

import { NFTStorage, File } from "nft.storage";

const NFT_STORAGE_TOKEN = process.env.NFT_TOKEN_STORAGE_KEY ?? "";
const client = new NFTStorage({ token: NFT_STORAGE_TOKEN });

type ResponseData = {
  url: string;
  image: string;
};

async function mergeLayers(layers: any): Promise<[Buffer, string]> {
  const imageLayers: any = [];

  Object.keys(layers).forEach((key) => {
    const imagePath = join(process.cwd(), "public", "images", key);

    imageLayers.push(`${imagePath}/${layers[key]}.png`);
  });

  const base64String = await mergeImages(imageLayers, {
    Canvas: Canvas,
    Image: Image,
  });

  const buffer = Buffer.from(base64String.split(",")[1], "base64");

  try {
    const result = await Jimp.read(buffer);
    return [await result.getBufferAsync("image/png"), base64String];
  } catch (error: any) {
    throw new Error(error);
  }
}

function calculateProbability(layerProbabilities: any): string | 0 {
  const total = Object.values(layerProbabilities).reduce(
    (a: any, b: any) => a + b,
    0
  );

  if (total !== 100) {
    throw new Error("probabilities must equal 100");
  }

  // invert the probabilties to be be keys that add up to 100
  // { 15: "white", 90: "black", 99: "silver", 100: "gold"}
  let sum = 0;
  const probabilties: { [key: number]: string } = {};
  Object.keys(layerProbabilities).forEach((key) => {
    sum += Number(layerProbabilities[key]);
    probabilties[Number(sum)] = key;
  });

  // calculate the weighted probability
  // https://stackoverflow.com/questions/61422806/how-to-increase-or-decrease-the-probability-of-an-item-of-an-array-being-picked

  const keys = Object.keys(probabilties).map(Number);
  const rand = Math.floor(Math.random() * 100);
  const key = keys.find((key) => rand < key);
  return key ? probabilties[key] : 0;
}

function randomFullImage(layers: any) {
  const imageLayers: { [key: string]: string | 0 } = {};

  const keys = Object.keys(layers);

  keys.forEach((key) => {
    imageLayers[key] = calculateProbability(layers[key]);
  });

  return imageLayers;
}

async function saveToIPFS(
  imageBuffer: Buffer,
  traits: { [key: string]: string | 0 }
) {
  const imageFile = new File([imageBuffer], "boy.png", {
    type: "image/png",
  });

  const attributes: any = [];

  Object.keys(traits).forEach((key) => {
    attributes.push({ trait_type: key, value: traits[key] });
  });

  const metadata = await client.store({
    name: "",
    description: "",
    image: imageFile,
    attributes,
    dna: objectHash.MD5(traits),
  });

  return metadata;
}

// https://www.bullionvault.co.uk/silver-guide/gold-silver-ratio
const background = {
  white: 80,
  shiny: 20,
};

// https://www.researchgate.net/figure/Percentage-of-face-shapes-type-in-males_tbl2_332926733
const face = {
  square: 20,
  oval: 12,
  round: 41,
  heart: 3,
  triangle: 24,
};

// https://www.researchgate.net/figure/Number-and-percentages-of-hair-colours-in-the-UK-Biobank-cohort-by-gender_tbl1_329405511
const hair = {
  red: 4, // #E25822
  blonde: 10, // #fbe7a1
  brown: 40, // #B38B67
  sienna: 37,
  black: 8,
  silver: 1,
};

// https://www.glasses.com/gl-us/blog/rarest-eye-color
const eyes = {
  green: 9, // #046307
  hazel: 18, // #C8B575
  blue: 27, // #40B0E0
  sienna: 45, // sienna
  grey: 1, // silver
};

const mouth = {
  smile: 33,
  closed: 34,
  frown: 33,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const layers = randomFullImage({
    background,
    face,
    hair,
    eyes,
    mouth,
  });

  const [image, base64String] = await mergeLayers(layers);

  const metadata = await saveToIPFS(image, layers);

  res.status(200).json({ url: metadata.url, image: base64String });
}
