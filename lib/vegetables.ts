export interface Vegetable {
  official: string; // eNAM commodity name
  aliases: string[]; // common names, Hindi + English for search
  category?: string;
}

export const VEGETABLES: Vegetable[] = [
  { official: "Onion", aliases: ["Pyaz", "Kanda", "Onion", "Pyaj"] },
  { official: "Potato", aliases: ["Aloo", "Batata", "Potato"] },
  { official: "Tomato", aliases: ["Tamatar", "Tomato", "Tamat"] },
  { official: "Brinjal", aliases: ["Baingan", "Brinjal", "Eggplant", "Vangi"] },
  { official: "Cabbage", aliases: ["Band Gobhi", "Cabbage", "Patta Gobhi"] },
  { official: "Cauliflower", aliases: ["Phool Gobhi", "Cauliflower", "Gobhi"] },
  { official: "Carrot", aliases: ["Gajar", "Carrot"] },
  { official: "Radish", aliases: ["Mooli", "Radish", "Muli"] },
  { official: "Turnip", aliases: ["Shalgam", "Turnip"] },
  { official: "Beetroot", aliases: ["Chukandar", "Beetroot", "Beet"] },
  { official: "Spinach", aliases: ["Palak", "Spinach", "Saag"] },
  { official: "Fenugreek", aliases: ["Methi", "Fenugreek leaves", "Methi Saag"] },
  { official: "Coriander", aliases: ["Dhania", "Coriander leaves", "Hara Dhania"] },
  { official: "Green Chilli", aliases: ["Hari Mirch", "Green Chilli", "Chilli"] },
  { official: "Capsicum", aliases: ["Shimla Mirch", "Capsicum", "Bell Pepper", "Simla"] },
  { official: "Lady Finger", aliases: ["Bhindi", "Lady Finger", "Okra"] },
  { official: "Bitter Gourd", aliases: ["Karela", "Bitter Gourd"] },
  { official: "Bottle Gourd", aliases: ["Lauki", "Bottle Gourd", "Ghiya", "Doodhi"] },
  { official: "Pumpkin", aliases: ["Kaddu", "Pumpkin", "Sitaphal"] },
  { official: "Cucumber", aliases: ["Kheera", "Cucumber", "Khira"] },
  { official: "French Beans", aliases: ["French Beans", "Beans", "Phali"] },
  { official: "Cluster Beans", aliases: ["Gawar", "Guar", "Cluster Beans"] },
  { official: "Peas", aliases: ["Matar", "Green Peas", "Peas"] },
  { official: "Garlic", aliases: ["Lehsun", "Garlic"] },
  { official: "Ginger", aliases: ["Adrak", "Ginger"] },
  { official: "Lemon", aliases: ["Nimbu", "Lemon", "Limbu"] },
  { official: "Chilli", aliases: ["Mirch", "Red Chilli", "Dry Chilli"] },
  { official: "Sweet Potato", aliases: ["Shakarkandi", "Sweet Potato"] },
  { official: "Yam", aliases: ["Jimikand", "Suran", "Yam"] },
];
