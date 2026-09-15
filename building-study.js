import { createBuildingStudy } from "./study-viewer.js";
import { createCrainBuilding } from "./models/crain-communications.js";

createBuildingStudy({ models: [createCrainBuilding()] });
