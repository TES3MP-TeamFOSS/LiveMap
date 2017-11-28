-- TES3MP HeightMap -*-lua-*-
-- "THE BEER-WARE LICENCE" (Revision 42):
-- <mail@michael-fitzmayer.de> wrote this file.  As long as you retain
-- this notice you can do whatever you want with this stuff. If we meet
-- some day, and you think this stuff is worth it, you can buy me a beer
-- in return.  Michael Fitzmayer


JsonInterface = require("jsonInterface")
Config.HeightMap = import(getModFolder() .. "config.lua")


local timerHMCollect
local timerHMSave
local HeightMap = {}


function HMCollect()
    local gridSize = 64
    local tolerance = 32

    Players.for_each(function(player)
            if player:getCell():isExterior() == true then
                local posx, posy, posz = player:getPosition()
                local posz = math.ceil(posz)

                local hitX = false
                local hitY = false

                if posx >= 0 then
                    if posx % gridSize <= tolerance then hitX = true end
                    posx = posx - (posx % gridSize)
                else
                    if math.abs(posx) % gridSize <= tolerance then hitX = true end
                    posx = math.abs(posx) - (math.abs(posx) % gridSize)
                    posx = posx - (posx * 2)
                end

                if posy >= 0 then
                    if posy % gridSize <= tolerance then hitY = true end
                    posy = posy - (posy % gridSize)
                else
                    if math.abs(posy) % gridSize <= tolerance then hitY = true end
                    posy = math.abs(posy) - (math.abs(posy) % gridSize)
                    posy = posy - (posy * 2)
                end

                if hitX == true and hitY == true then
                    logMessage(Log.LOG_INFO, "HMCollect: [" .. posx .. "]x[" .. posy .. "]: " .. posz .. "\n")

                    if HeightMap[posx] == nil then
                        HeightMap[posx] = {}
                    end

                    HeightMap[posx][posy] = posz
                end
            end
    end)

    timerHMCollect:start()
end


function HMSave()
    JsonInterface.save(Config.HeightMap.path .. "HeightMap.json", HeightMap)
    timerHMSave:start()
end


Event.register(Events.ON_POST_INIT, function()
                   timerHMCollect = TimerCtrl.create(HMCollect, (Config.HeightMap.collectInterval * 1000), { timerHMCollect })
                   timerHMSave = TimerCtrl.create(HMSave, (Config.HeightMap.saveInterval * 1000), { timerHMSave })
                   timerHMCollect:start()
                   timerHMSave:start()
end)
