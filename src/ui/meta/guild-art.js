import { ROOM_WALLS, ROOM_FLOORS } from "../../guild-catalog.js?v=0.126.0";
const svg = (content, viewBox = "0 0 200 160") => `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${content}</svg>`;
export function guildFinishArt(surface, value) {
  const color = (surface === "wall" ? ROOM_WALLS : ROOM_FLOORS).find(entry => entry.id === value)?.color || "#557069";
  return surface === "wall" ? svg(`<path fill="${color}" stroke="#d8b878" stroke-width="4" d="M20 20h160v120H20Z"/><path stroke="#172732" stroke-opacity=".5" stroke-width="3" d="M22 50h156M22 80h156M22 110h156M60 22v28m80-28v28M100 50v30m-40 0v30m80-30v30m-40 0v28"/>`)
    : svg(`<path fill="#322720" stroke="#c8a165" stroke-width="3" d="m10 80 90-55 90 55v14l-90 55-90-55Z"/><path fill="${color}" stroke="#dfbd81" stroke-width="3" d="m10 80 90-55 90 55-90 55Z"/><path stroke="#253039" stroke-opacity=".5" stroke-width="2" d="m32 67 90 55m-67-69 90 55m-67-69 90 55m-135 0 90-55m-67 69 90-55m-67 69 90-55"/>`);
}
export function clanEmblemArt(id) {
  const symbols = {
    sun: '<circle cx="100" cy="75" r="25"/><path d="M100 30v12m0 66v12M55 75h12m66 0h12M68 43l9 9m46 46 9 9M68 107l9-9m46-46 9-9"/>',
    mountain: '<path d="m43 110 42-68 22 36 13-21 38 53Zm28-43 14 11 13-11M105 81l15 11 12-11"/>',
    lotus: '<path d="M100 117C63 90 67 56 100 31c33 25 37 59 0 86Zm0 0C54 118 38 84 44 59c35 3 52 20 56 58Zm0 0c46 1 62-33 56-58-35 3-52 20-56 58Z"/>',
    moon: '<path d="M120 34a44 44 0 1 0 24 72c-41 8-65-37-24-72Z"/><path d="m144 38 3 9 10 3-10 3-3 10-3-10-10-3 10-3Z"/>'
  };
  return svg(`<path d="M30 15h140v76c0 30-36 53-70 65-34-12-70-35-70-65Z" fill="var(--clan-color,#8b3342)" stroke="#d5b775" stroke-width="4"/><g stroke="#f4deb0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${symbols[id] || symbols.sun}</g>`);
}
export function guildDecorArt(id) {
  if (id === "landscape") return svg('<path fill="#6c3f29" stroke="#cfad70" stroke-width="5" d="M4 7h192v146H4z"/><path fill="#253f60" d="M14 17h172v126H14z"/><circle fill="#ead9a5" cx="144" cy="44" r="16"/><path fill="#4c637a" d="m14 121 55-76 27 48 30-28 60 68v10H14Z"/><path fill="#8795a0" d="m46 77 23-32 19 34-20-11Z"/><path fill="#173d47" d="m14 134 57-29 47 21 68-12v29H14Z"/>');
  if (id === "scroll") return svg('<path fill="#a8673e" stroke="#ddb878" stroke-width="5" d="M40 4h120v18H40zM40 138h120v18H40z"/><path fill="#dfcda4" stroke="#8b5936" stroke-width="3" d="M50 18h100v122H50z"/><text x="100" y="100" fill="#513e38" font-size="60" text-anchor="middle" font-family="serif">道</text>');
  if (id === "lantern") return svg('<path stroke="#4c2c25" stroke-width="5" d="M100 0v20"/><path fill="#a55934" stroke="#e4b968" stroke-width="3" d="M67 18h66v12H67zm0 110h66v12H67z"/><rect x="48" y="30" width="104" height="98" rx="28" fill="#eeb664" stroke="#6c3e27" stroke-width="4"/><path stroke="#bd713f" stroke-width="3" d="M64 45h72M55 64h90M52 84h96M58 106h84M88 33v91m24-91v91"/><text x="100" y="100" text-anchor="middle" font-size="38" fill="#77442e">灯</text>');
  if (id === "plant") return svg('<path stroke="#77513d" stroke-width="13" d="M103 123c-24-28 34-34 1-63M98 92 66 70m38 0 30-22"/><g fill="#426b58" stroke="#293e37" stroke-width="3"><ellipse cx="62" cy="64" rx="38" ry="19"/><ellipse cx="125" cy="45" rx="45" ry="24"/><ellipse cx="103" cy="22" rx="39" ry="17"/></g><path fill="#59415e" stroke="#c1a276" stroke-width="4" d="m55 119 10 34h74l10-34Z"/><path stroke="#c1a276" stroke-width="3" d="M52 119h100"/>');
  if (id === "table") return svg('<path fill="#091011" opacity=".25" d="m8 118 94-44 91 44-91 42Z"/><path fill="#4b3025" stroke="#2d211d" stroke-width="3" d="M26 77h12v45l-12-6zm127-1h12v40l-12 6zm-60 29h14v44l-14-6Z"/><path fill="#714b32" stroke="#38291f" stroke-width="3" d="m8 67 94-44 91 44v14l-91 45L8 81Z"/><path fill="#bd8b52" stroke="#efc680" stroke-width="2" d="m8 67 94-44 91 44-91 45Z"/><path fill="#905e3b" d="m102 32 71 35-71 35-74-35Z"/><path fill="#cda469" d="m102 37 60 30-60 30-63-30Z"/><ellipse fill="#e4cda4" cx="65" cy="69" rx="10" ry="5"/><path fill="#e8d7af" d="M57 61v7q8 8 16 0v-7Z"/><ellipse fill="#557b70" stroke="#e0bf80" stroke-width="2" cx="119" cy="59" rx="20" ry="13"/><path stroke="#e0bf80" stroke-width="3" d="m131 53 13-8-6 14m-36-7-12-4m22-4q7-10 12 0"/><path stroke="#f8dcaa" stroke-opacity=".6" stroke-width="2" d="M112 34q-7-9 2-15m7 13q-6-7 1-13"/>');
  if (id === "cushion") return svg('<path fill="#091011" opacity=".22" d="m8 113 91-45 93 45-91 44Z"/><path fill="#502338" stroke="#d2a76c" stroke-width="3" d="m14 87 85-43 88 43v23l-86 42-87-42Z"/><path fill="#873a52" stroke="#e0bd7e" stroke-width="3" d="m14 87 85-43 88 43-86 42Z"/><path stroke="#b56d78" stroke-width="2" d="m30 87 69-34 72 34-70 33Z"/><path stroke="#d2a76c" stroke-width="2" d="m99 52 2 68m-71-33h141"/><ellipse fill="#e9c483" cx="101" cy="87" rx="5" ry="3"/>');
  if (id === "trophy") return svg('<path fill="#b78b40" stroke="#f0cc78" stroke-width="4" d="M64 18h72v35q-4 38-30 43v28h32v16H62v-16h32V96Q68 91 64 53Z"/><path stroke="#cba355" stroke-width="8" d="M64 30H40q-4 45 37 44m59-44h24q4 45-37 44"/><path fill="#584052" stroke="#dfba75" stroke-width="3" d="M50 140h100v17H50z"/>');
  const emblem = id === "guardian" ? "sun" : id === "medal" ? "lotus" : "mountain";
  return clanEmblemArt(emblem);
}
export { guildRoomBackdrop } from "./guild-room-art.js?v=0.124.0";
