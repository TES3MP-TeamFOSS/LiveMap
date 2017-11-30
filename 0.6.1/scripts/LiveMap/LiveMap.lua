-- LiveMap.lua -*-lua-*-
-- "THE BEER-WARE LICENCE" (Revision 42):
-- <mail@michael-fitzmayer.de> wrote this file.  As long as you retain
-- this notice you can do whatever you want with this stuff. If we meet
-- some day, and you think this stuff is worth it, you can buy me a beer
-- in return.  Michael Fitzmayer


json = require ("dkjson")
time = require ("time")


-- Add [ LiveMap = require("LiveMap") ] to the top of server.lua


local Info = {}
local Marker = {}
local pathLM = "/path/to/assets/json/"
local updateInterval = 1
local timerLiveMap = tes3mp.CreateTimerEx("TimerLiveMapExpired", time.seconds(updateInterval), "i", 0)


tes3mp.StartTimer(timerLiveMap)


function JsonLoad(fileName)
    local file = assert(io.open(fileName, 'r'), 'Error loading file: ' .. fileName);
    local content = file:read("*all");
    file:close();
    return json.decode(content, 1, nil);
end


function JsonSave(fileName, data, keyOrderArray)
    local content = json.encode(data, { indent = true, keyorder = keyOrderArray })
    local file = assert(io.open(fileName, 'w+b'), 'Error loading file: ' .. fileName)
    file:write(content)
    file:close()
end


function Update()
    local tmpInfo = Info
    Info = {}
    for pid, player in pairs(Players) do
      local playerName = Players[pid].name
        if player:IsLoggedIn() then
          local isOutside = tes3mp.IsInExterior(pid)
          if isOutside == true then
            Info[playerName] = {}
            Info[playerName].pid = pid
            Info[playerName].x = math.floor(tes3mp.GetPosX(pid) + 0.5)
            Info[playerName].y = math.floor(tes3mp.GetPosY(pid) + 0.5)
            Info[playerName].rot = math.floor( math.deg(tes3mp.GetRotZ(pid)) + 0.5) % 360
            Info[playerName].cell = tes3mp.GetCell(pid)
            Info[playerName].isOutside = isOutside
          else
            if tmpInfo[playerName] ~= nil then
              Info[playerName] = {}
              Info[playerName].pid = tmpInfo[playerName].pid
              Info[playerName].x = tmpInfo[playerName].x
              Info[playerName].y = tmpInfo[playerName].y
              Info[playerName].rot = tmpInfo[playerName].rot
              Info[playerName].cell = tes3mp.GetCell(pid)
              Info[playerName].isOutside = isOutside
            end
          end
        end
    end

    JsonSave(pathLM .. "LiveMap.json", Info)
    tes3mp.StartTimer(timerLiveMap)
end


function GetCellByExteriorXY(x, y)
    x = x / 8192
    y = y / 8192

    x = math.floor(x)
    y = math.floor(y)

    return tostring(x) .. ", " .. tostring(y)
end


function TimerLiveMapExpired()
    Update()
end
