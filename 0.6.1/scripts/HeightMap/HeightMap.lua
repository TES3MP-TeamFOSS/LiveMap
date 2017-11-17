-- HeightMap.lua -*-lua-*-
-- "THE BEER-WARE LICENSE" (Revision 42):
-- <mail@michael-fitzmayer.de> wrote this file.  As long as you retain
-- this notice you can do whatever you want with this stuff. If we meet
-- some day, and you think this stuff is worth it, you can buy me a beer
-- in return.  Michael Fitzmayer


json = require("dkjson")
time = require("time")


-- Add [ HeightMap = require("HeightMap") ] to the top of server.lua


local HeightMap = {}
local pathHM = "/path/to/assets/json/"
local intervalCollect = 2
local intervalSave = 30
local timerHMCollect = tes3mp.CreateTimerEx("HMCollectTimerExpired", time.seconds(intervalCollect), "i", 0)
local timerHMSave = tes3mp.CreateTimerEx("HMSaveTimerExpired", time.seconds(intervalSave), "i", 0)


tes3mp.StartTimer(timerHMCollect)
tes3mp.StartTimer(timerHMSave)


function JsonLoad(fileName)
    local file = assert(io.open(fileName, 'r'), 'Error loading file: ' .. fileName);
    local content = file:read("*all");
    file:close();
    return json.decode(content, 1, nil);
end
HeightMap = JsonLoad(pathHM .. "HeightMap.json")


function JsonSave(fileName, data, keyOrderArray)
    local content = json.encode(data, {indent = true, keyorder= keyOrderArray});
    local file = assert(io.open(fileName, 'w+b'), 'Error loading file: ' .. fileName);
    file:write(content);
    file:close();
end


function HMCollect()
    local gridSize = 64
    local tolerance = 32

    for pid, player in pairs(Players) do
        if Players[pid] ~= nil and Players[pid]:IsLoggedIn() then
            if tes3mp.IsInExterior(pid) == true then
                local posx = tes3mp.GetPosX(pid)
                local posy = tes3mp.GetPosY(pid)
                local posz = tes3mp.GetPosZ(pid)

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
                    tes3mp.LogAppend(0, "HMCollect: [" .. posx .. "]x[" .. posy .. "]: " .. posz .. "\n")

                    if HeightMap[posx] == nil then
                        HeightMap[posx] = {}
                    end

                    HeightMap[posx][posy] = posz
                end
            end
        end
    end

    tes3mp.StartTimer(timerHMCollect);
end


function HMCollectTimerExpired()
    HMCollect()
end


function HMSaveTimerExpired()
    JsonSave(pathHM .. "HeightMap.json", HeightMap)
    tes3mp.StartTimer(timerHMSave, HeightMap)
end
