import { M01 } from "./m01-gato/mission.js";
import { M02 } from "./m02-desfiladero/mission.js";
import { M03 } from "./m03-umbral/mission.js";
import { M04 } from "./m04-corazon/mission.js";
import { M05 } from "./m05-raizen/mission.js";
import { S01 } from "./s01-kagemori/mission.js";
import { S02 } from "./s02-medico/mission.js";

export const STORY_SAGA = { id: "saga-1", number: 1, title: "Futuro prometedor", subtitle: "Tu primera misión como combatiente de la aldea", missionIds: ["m01", "m02", "m03", "m04", "m05"] };
export const STORY_SAGAS = [STORY_SAGA];
export const MISSIONS = [M01, M02, M03, M04, M05];
export const SECONDARY_MISSIONS = [S01, S02];
