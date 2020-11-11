const Eris = require("eris");
var bot = new Eris(""); // TOKEN
const fs = require("fs");

// prefix for bot to respond to
let PREF = "m.";

// get specific field from .fbi file (also works for the .tdf file for weapons)
function getFBIVal(data, field){
	let dataIndex = data.indexOf(field + "=");
	let dataIndexLower = data.indexOf((field + "=").toLowerCase());
	if(dataIndexLower < dataIndex && dataIndexLower != -1){
		dataIndex = dataIndexLower;
	}
	if(dataIndex == -1 && dataIndexLower != -1){
		dataIndex = dataIndexLower;
	}
	if(dataIndex == -1){
		return 0;
	}
	let tempIndex = dataIndex + (field + "=").length;
	let tempVal = "";
	let maxCount = 200;
	while(tempIndex != -1 && data.charAt(tempIndex) != ';' && maxCount > 0){
		tempVal += data.charAt(tempIndex);
		tempIndex++;
		maxCount--;
	}
	return tempVal;
}

// get unit stats from .fbi file
function getUnitFromFile(file) {
	let data;
	try {
		data = fs.readFileSync("./units/" + file, 'utf8');
		let unit = {};
		unit.speed = getFBIVal(data, "MaxVelocity");
		unit.name = getFBIVal(data, "Name");
		unit.id = getFBIVal(data, "UnitName");
		unit.faction = getFBIVal(data, "Side");
		unit.description = getFBIVal(data, "Description");
		unit.health = getFBIVal(data, "MaxDamage");
		unit.metalCost = getFBIVal(data, "buildcostmetal");

		unit.weapons = [];
		let weapCount = 1;
		let bigOrSmallW = "w";
		if(data.indexOf("Weapon1") != -1){
			bigOrSmallW = "W";
		}
		while(data.indexOf(bigOrSmallW + "eapon" + weapCount) != -1){
			unit.weapons.push(getFBIVal(data, bigOrSmallW + "eapon" + weapCount));
			weapCount++;
		}
		return unit;
	} catch (err){
		console.log("File not found!");
	}
}

// get armor type for unit. only load file once and grab references for l/m/h armor at the start
let ARMORTYPES;
try{
	ARMORTYPES = fs.readFileSync("./unitinfo/armor.txt", 'utf8');
} catch (err){
	console.log("Error loading armor.txt");
}
let l_ref = ARMORTYPES.indexOf("armor_light");
let m_ref = ARMORTYPES.indexOf("armor_medium");
let h_ref = ARMORTYPES.indexOf("armor_heavy");
function getArmorType(unitID){
	let unit_ref = ARMORTYPES.indexOf(unitID);
	if(unit_ref > l_ref && unit_ref < m_ref){
		return "L";
	} else if(unit_ref < h_ref){
		return "M";
	} else {
		return "H";
	}
}

// grab weapon data given its name
let WEAPONDATA;
try{
	WEAPONDATA = fs.readFileSync("./unitinfo/weapons.tdf", 'utf8');
} catch (err){
	console.log("Error loading weapons.tdf");
}
function getWeaponInfo(weapon){
	let tempWeap = WEAPONDATA;
	let weapInd = tempWeap.indexOf(weapon);
	if(weapInd != -1){
		tempWeap = tempWeap.slice(weapInd);
	}
	tempWeap = tempWeap.substring(0, tempWeap.indexOf("armor_light"));
	let returnWeapon = {};
	returnWeapon.name = getFBIVal(tempWeap, "Name");
	returnWeapon.range = getFBIVal(tempWeap, "range");
	returnWeapon.energyPerShot = getFBIVal(tempWeap, "energypershot");
	returnWeapon.aoe = getFBIVal(tempWeap, "areaofeffect");
	returnWeapon.damage = getFBIVal(tempWeap, "default");
	returnWeapon.reload = getFBIVal(tempWeap, "reloadtime");
	returnWeapon.burnblow = getFBIVal(tempWeap, "burnblow");
	returnWeapon.velocity = getFBIVal(tempWeap, "weaponvelocity");
	returnWeapon.impulse = getFBIVal(tempWeap, "impulsefactor");
	return returnWeapon;
}

// Create nice looking embed for unit
function createUnitEmbed(unit){
	let factionURL;
	let factionColor;
	switch(unit.faction){
		case "Aven":
			factionURL = "http://metalfactions.pt/images/factions/aven_sml.png";
			factionColor = 0xADD8E6;
			break;
		case "Sphere":
			factionURL = "http://metalfactions.pt/images/factions/sphere_sml.png";
			factionColor = 0x800080;
			break;
		case "Gear":
			factionURL = "http://metalfactions.pt/images/factions/gear_sml.png";
			factionColor = 0xFFA500;
			break;
		case "Claw":
			factionURL = "http://metalfactions.pt/images/factions/claw_sml.png";
			factionColor = 0x000080;
			break;
		default:
			factionURL = "http://metalfactions.pt/images/factions/random_sml.png";
			factionColor = 0x000000;
	}
	let returnEmbed = {
        embed: {
            description: unit.description,
            image: {
            	url: "http://metalfactions.pt/images/unitpics/" + unit.id + ".png"
            },
            author: {
                name: unit.faction.toUpperCase() + " " + unit.name,
                icon_url: factionURL
            },
            color: factionColor,
            fields: [
                {
                    name: "Cost",
                    value: unit.metalCost + " metal",
                    inline: true
                },
                {
                    name: "HP",
                    value: unit.health + " (" + getArmorType(unit.id) + ")",
                    inline: true
                },
                {
                    name: "Speed",
                    value: unit.speed,
                    inline: true
                }
            ],
            footer: { // Footer text
                text: "Made by Zow, for Metal Factions. Play Metal Factions at http://metalfactions.pt"
            }
        }
    }
    let firstWeap = true;
    for(let i = 0; i < unit.weapons.length; i++){
    	if(firstWeap){
    		firstWeap = false;
    		returnEmbed.embed.fields.push({
	    		name: "\u200B",
	    		value: "\u200B",
	    		inline: false
	    	});
    	}
    	let weaponInfo = getWeaponInfo(unit.weapons[i]);
    	if(weaponInfo.name == "Energy shield"){
    		continue;
    	}
    	returnEmbed.embed.fields.push({
    		name: "Weapon " + (i+1) + ": " + weaponInfo.name,
    		value: "Range: " + weaponInfo.range,
    		inline: false
    	});
    	returnEmbed.embed.fields.push({
    		name: "Damage",
    		value: weaponInfo.damage + " dmg/" + weaponInfo.reload + (weaponInfo.reload == 1 ? " second" : " seconds") + " (" + (weaponInfo.damage/weaponInfo.reload).toFixed(2) + " dps)",
    		inline: true
    	});
    	returnEmbed.embed.fields.push({
    		name: "Energy Cost",
    		value: weaponInfo.energyPerShot + " e to fire (" + (weaponInfo.energyPerShot / weaponInfo.reload).toFixed(2) + " e/s)",
    		inline: true
    	});
    }
    return returnEmbed;
}

// send DM to user	
function nil() {};
function dm(userID, message) {
    var user = stats[userID];
    if (user.dm) {
        bot.createMessage(user.dm.id, message);
    } else {
        bot.getDMChannel(userID).then(function(channel) {
            stats[userID].dm = channel;
            bot.createMessage(user.dm.id, message);
        }, nil);
    }
};
	
bot.on("disconnect", () => {bot.connect()});
	
bot.on("messageCreate", (msg) => {
	// to make embedding easier
	simpleEmbed = function(clr, message){
		bot.createMessage(msg.channel.id, {embed: {
	   		color: clr,
	  		description: message,
		}});
	}
	
	// Prevent Bots
	if(msg.author.bot){
		return;
	}
	
	// Don't respond to DMs
	if(msg.channel.recipient){
		return;
	}
	// Called when visible message is sent
	if(msg.content.indexOf(PREF) == 0){
		// Ping
		full = msg.content.split(" ");
		if(full[0].toLowerCase() == PREF + "ping"){
			simpleEmbed(0xAAAAAA, "pong");
		}
		
		// Help
		if(full[0].toLowerCase() == PREF + "invite"){
			bot.createMessage(msg.channel.id, {
	            embed: {
	                title: "Invite MetalWoz to your server",
	                description: "The following link will allow you to add MetalWoz to a server you manage:\nhttps://discord.com/api/oauth2/authorize?client_id=775560060058730576&permissions=67648&scope=bot",
	                color: 0x008000,
	                footer: {
	                    text: "Made by Zow, for Metal Factions. Play Metal Factions at http://metalfactions.pt"
	                }
	            }
	        });
		}

		if(full[0].toLowerCase() == PREF + "unit"){
			let validSearch = false;
			let fileName = full[1].toLowerCase();
			for(let i = 2; i < full.length; i++){
				fileName += "_" + full[i].toLowerCase();
			}
			fileName += ".fbi";
			try {
				if(fs.existsSync("./units/" + fileName)){
					validSearch = true;
				} else {
					validSearch = false;
				}
			} catch (err){
				validSearch = false;
			}
			if(validSearch){
				let searchQuery = getUnitFromFile(fileName);
				bot.createMessage(msg.channel.id, createUnitEmbed(searchQuery));
			}
		}
	}
});

bot.connect();