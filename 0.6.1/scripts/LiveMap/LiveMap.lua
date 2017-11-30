-- LiveMap.lua -*-lua-*-
-- "THE BEER-WARE LICENCE" (Revision 42):
-- <mail@michael-fitzmayer.de> wrote this file.  As long as you retain
-- this notice you can do whatever you want with this stuff. If we meet
-- some day, and you think this stuff is worth it, you can buy me a beer
-- in return.  Michael Fitzmayer


json = require("dkjson")
time = require("time")


-- Add [ LiveMap = require("LiveMap") ] to the top of server.lua


local pathJson = "/path/to/assets/json/"
local intervalLiveMapUpdate = 1
local intervalHeightMapCollect = 1
local intervalHeightMapSave = 20

local heightMap = {}
local heightMapMarkerClick = {}
local liveMap = {}
local timerHeightMapCollect = tes3mp.CreateTimerEx("TimerHeightMapCollectExpired", time.seconds(intervalHeightMapCollect), "i", 0)
local timerHeightMapSave = tes3mp.CreateTimerEx("TimerHeightMapSaveExpired", time.seconds(intervalHeightMapSave), "i", 0)
local timerLiveMapUpdate = tes3mp.CreateTimerEx("TimerLiveMapUpdateExpired", time.seconds(intervalLiveMapUpdate), "i", 0)


tes3mp.StartTimer(timerHeightMapCollect)
tes3mp.StartTimer(timerHeightMapSave)
tes3mp.StartTimer(timerLiveMapUpdate)


function JsonLoad(fileName)
    local file = assert(io.open(fileName, 'r'), 'Error loading file: ' .. fileName);
    local content = file:read("*all");
    file:close();
    return json.decode(content, 1, nil);
end
heightMap = JsonLoad(pathJson .. "HeightMap.json")


function JsonSave(fileName, data, keyOrderArray)
    local content = json.encode(data, { indent = true, keyorder = keyOrderArray })
    local file = assert(io.open(fileName, 'w+b'), 'Error loading file: ' .. fileName)
    file:write(content)
    file:close()
end


function HeightMapCollect()
    local gridSize = 64
    local tolerance = 32

    for pid, player in pairs(Players) do
        if Players[pid] ~= nil and Players[pid]:IsLoggedIn() then
            if tes3mp.IsInExterior(pid) == true then
                local posx = tes3mp.GetPosX(pid)
                local posy = tes3mp.GetPosY(pid)
                local posz = math.ceil(tes3mp.GetPosZ(pid))

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
                    tes3mp.LogAppend(1, "HMCollect: [" .. posx .. "]x[" .. posy .. "]: " .. posz .. "\n")

                    if heightMap[posx] == nil then
                        heightMap[posx] = {}
                    end

                    heightMap[posx][posy] = posz
                end
            end
        end
    end

    tes3mp.StartTimer(timerHeightMapCollect);
end


function HeightMapSave()
    JsonSave(pathJson .. "HeightMap.json", heightMap)
    tes3mp.StartTimer(timerHeightMapSave, heightMap)
end


function LiveMapUpdate()
    local tmpLiveMap = liveMap
    liveMap = {}
    for pid, player in pairs(Players) do
      local playerName = Players[pid].name
        if player:IsLoggedIn() then
          local isOutside = tes3mp.IsInExterior(pid)
          if isOutside == true then
            liveMap[playerName] = {}
            liveMap[playerName].pid = pid
            liveMap[playerName].x = math.floor(tes3mp.GetPosX(pid) + 0.5)
            liveMap[playerName].y = math.floor(tes3mp.GetPosY(pid) + 0.5)
            liveMap[playerName].rot = math.floor( math.deg(tes3mp.GetRotZ(pid)) + 0.5) % 360
            liveMap[playerName].cell = tes3mp.GetCell(pid)
            liveMap[playerName].isOutside = isOutside
          else
            if tmpLiveMap[playerName] ~= nil then
              liveMap[playerName] = {}
              liveMap[playerName].pid = tmpLiveMap[playerName].pid
              liveMap[playerName].x = tmpLiveMap[playerName].x
              liveMap[playerName].y = tmpLiveMap[playerName].y
              liveMap[playerName].rot = tmpLiveMap[playerName].rot
              liveMap[playerName].cell = tes3mp.GetCell(pid)
              liveMap[playerName].isOutside = isOutside
            end
          end
        end
    end

    JsonSave(pathJson .. "LiveMap.json", liveMap)
    tes3mp.StartTimer(timerLiveMapUpdate)
end


function GetCellByExteriorXY(x, y)
    x = x / 8192
    y = y / 8192

    x = math.floor(x)
    y = math.floor(y)

    return tostring(x) .. ", " .. tostring(y)
end


function TimerHeightMapCollectExpired()
    HeightMapCollect()
end


function TimerHeightMapSaveExpired()
    HeightMapSave()
end


function TimerLiveMapUpdateExpired()
    LiveMapUpdate()
end
