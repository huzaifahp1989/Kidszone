"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
const logFile = path_1.default.resolve(process.cwd(), 'scripts', 'update.log');
function log(msg) {
    fs.appendFileSync(logFile, msg + '\n');
    console.log(msg);
}
// Load .env.local
dotenv.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
const supabaseAdmin = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function main() {
    log('Starting update...');
    try {
        const updates = [
            { name: 'Sara', points: 388, badges: 3 },
            { name: 'Husnain', points: 243, badges: 2 }
        ];
        for (const update of updates) {
            log(`Processing ${update.name}...`);
            // 1. Find User
            const { data: users, error: searchError } = await supabaseAdmin
                .from('users')
                .select('uid, name, points, weeklypoints, badges')
                .ilike('name', `%${update.name}%`)
                .limit(1);
            if (searchError || !users || users.length === 0) {
                log(`User ${update.name} not found or error: ${JSON.stringify(searchError)}`);
                continue;
            }
            const user = users[0];
            const userId = user.uid;
            log(`Found user ${user.name} (${userId})`);
            const newBadges = (user.badges || 0) + update.badges;
            // 2. Update users table
            const { error: updateError1 } = await supabaseAdmin
                .from('users')
                .update({
                weeklypoints: (user.weeklypoints || 0) + update.points,
                points: (user.points || 0) + update.points,
                badges: newBadges
            })
                .eq('uid', userId);
            if (updateError1)
                log(`Error updating users table: ${JSON.stringify(updateError1)}`);
            else
                log('Updated users table.');
            // 3. Update users_points table
            const { data: userPoints, error: pointsError } = await supabaseAdmin
                .from('users_points')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (!pointsError && userPoints) {
                const newBadgesPoints = (userPoints.badges || 0) + update.badges;
                const newLevel = 1 + Math.floor(newBadgesPoints / 5);
                const { error: upError } = await supabaseAdmin
                    .from('users_points')
                    .update({
                    weekly_points: (userPoints.weekly_points || 0) + update.points,
                    total_points: (userPoints.total_points || 0) + update.points,
                    badges: newBadgesPoints,
                    level: newLevel
                })
                    .eq('user_id', userId);
                if (upError)
                    log(`Error updating users_points: ${JSON.stringify(upError)}`);
                else
                    log('Updated users_points table.');
            }
            else if (pointsError && pointsError.code === 'PGRST116') {
                const newLevel = 1 + Math.floor(update.badges / 5);
                const { error: insError } = await supabaseAdmin
                    .from('users_points')
                    .insert({
                    user_id: userId,
                    weekly_points: update.points,
                    total_points: update.points,
                    badges: update.badges,
                    level: newLevel
                });
                if (insError)
                    log(`Error inserting users_points: ${JSON.stringify(insError)}`);
                else
                    log('Inserted into users_points table.');
            }
            else {
                log(`Error fetching users_points: ${JSON.stringify(pointsError)}`);
            }
        }
        log('Done.');
    }
    catch (error) {
        log(`Script error: ${error.message}`);
    }
}
main();
