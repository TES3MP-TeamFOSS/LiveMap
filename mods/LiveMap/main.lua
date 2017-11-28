-- TES3MP LiveMap -*-lua-*-
-- "THE BEER-WARE LICENCE" (Revision 42):
-- <mail@michael-fitzmayer.de> wrote this file.  As long as you retain
-- this notice you can do whatever you want with this stuff. If we meet
-- some day, and you think this stuff is worth it, you can buy me a beer
-- in return.  Michael Fitzmayer


JsonInterface = require("jsonInterface")
Config.LiveMap = import(getModFolder() .. "config.lua")


local timer
local Info = {}


function Update()
    local tmpInfo = Info
    Info = {}

    Players.for_each(function(player)
            if(player.name ~= nil and player.name ~= "") then
                local isOutside = player:getCell():isExterior()
                if isOutside == true then
                    Info[player.name] = {}
                    Info[player.name].x, Info[player.name].y = player:getPosition()
                    Info[player.name].rot = player:getRotation()
                    Info[player.name].x = math.floor( Info[player.name].x + 0.5)
                    Info[player.name].y = math.floor( Info[player.name].y + 0.5)
                    Info[player.name].rot = math.floor( math.deg(Info[player.name].rot) + 0.5 ) % 360
                    Info[player.name].isOutside = isOutside
                    Info[player.name].cell = player:getCell().description
                else
                    if tmpInfo[player.name] ~= nil then
                        Info[player.name] = tmpInfo[player.name]
                        Info[player.name].isOutside = isOutside
                        Info[player.name].cell = player:getCell().description
                    end
                end
            end
    end)

    JsonInterface.save(Config.LiveMap.path .. "LiveMap.json", Info)
    timer:start()
end


Event.register(Events.ON_POST_INIT, function()
                   timer = TimerCtrl.create(Update, (Config.LiveMap.updateInterval * 1000), { timer })
                   timer:start()
end)
