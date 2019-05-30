-- LiveMap.lua -*-lua-*-
-- "THE BEER-WARE LICENCE" (Revision 42):
-- <mail@michael-fitzmayer.de> wrote this file.  As long as you retain
-- this notice you can do whatever you want with this stuff. If we meet
-- some day, and you think this stuff is worth it, you can buy me a beer
-- in return.  Michael Fitzmayer

local LiveMap = {}

local time = require("time")

local pathJson = "/custom/web/assets/json/"
local heightMapMarkerCooldown = 5
local intervalLiveMapUpdate = 1
-- local intervalHeightMapMarkerClickCheck = 1
-- local intervalHeightMapCollect = 1
-- local intervalHeightMapSave = 30

-- Optionally use DataManager
if DataManager ~= nil then
   LiveMap.defaultConfig = {
      pathJson = pathJson,
      heightMapMarkerCooldown = heightMapMarkerCooldown,
      intervalLiveMapUpdate = intervalLiveMapUpdate,
   }

   LiveMap.config = DataManager.loadConfiguration("LiveMap", LiveMap.defaultConfig)

   pathJson = LiveMap.config.pathJson
   heightMapMarkerCooldown = LiveMap.config.heightMapMarkerCooldown
   intervalLiveMapUpdate = LiveMap.config.intervalLiveMapUpdate
end

local heightMap = jsonInterface.load(pathJson .. "HeightMap.json")
local liveMap

local timerLiveMapUpdate = tes3mp.CreateTimerEx("TimerLiveMapUpdateExpired",
                                                time.seconds(intervalLiveMapUpdate), "i", 0)

local function aPlayerIsLoggedIn()
   for pid, _ in pairs(Players) do
      if Players[pid]:IsLoggedIn() then
         return true
      end
   end
   return false
end

local function GetCellByExteriorXY(x, y)
   local X = math.floor(x / 8192)
   local Y = math.floor(y / 8192)
   return tostring(X) .. ", " .. tostring(Y)
end

-- TODO: HeightMap stuff is unused at the moment due to being rather spammy
-- function LiveMap.HeightMapMarkerClickCheck()
--    local heightMapMarkerClick = jsonInterface.load(pathJson .. "HeightMapMarkerClick.json")

--    local timeCurrent = os.time()

--    if heightMapMarkerClick.timestamp ~= nil then
--       if timeCurrent - heightMapMarkerClick.timestamp >= heightMapMarkerCooldown then
--          local cell = GetCellByExteriorXY(heightMapMarkerClick.x, heightMapMarkerClick.y)

--          if LoadedCells[cell] == nil then
--             tes3mp.LogAppend(1, cell .. " loaded via HeightMap marker.\n")
--             logicHandler.LoadCell(cell)
--          end

--       else
--          tes3mp.LogAppend("HeightMap marker clicked while cooldown still active.\n")
--       end
--    end
-- end

-- function LiveMap.HeightMapCollect()
--    local gridSize = 64
--    local tolerance = 32

--    for pid, _ in pairs(Players) do
--       if Players[pid] ~= nil and Players[pid]:IsLoggedIn() then
--          if tes3mp.IsInExterior(pid) == true then
--             local posx = tes3mp.GetPosX(pid)
--             local posy = tes3mp.GetPosY(pid)
--             local posz = math.ceil(tes3mp.GetPosZ(pid))

--             local hitX = false
--             local hitY = false

--             if posx >= 0 then
--                if posx % gridSize <= tolerance then hitX = true end
--                posx = posx - (posx % gridSize)
--             else
--                if math.abs(posx) % gridSize <= tolerance then hitX = true end
--                posx = math.abs(posx) - (math.abs(posx) % gridSize)
--                posx = posx - (posx * 2)
--             end

--             if posy >= 0 then
--                if posy % gridSize <= tolerance then hitY = true end
--                posy = posy - (posy % gridSize)
--             else
--                if math.abs(posy) % gridSize <= tolerance then hitY = true end
--                posy = math.abs(posy) - (math.abs(posy) % gridSize)
--                posy = posy - (posy * 2)
--             end

--             if hitX == true and hitY == true then
--                tes3mp.LogAppend(1, "HMCollect: [" .. posx .. "]x[" .. posy .. "]: " .. posz .. "\n")

--                if heightMap[posx] == nil then
--                   heightMap[posx] = {}
--                end

--                heightMap[posx][posy] = posz
--                jsonInterface.save(pathJson .. "HeightMap.json", heightMap)
--             end
--          end
--       end
--    end
-- end

function LiveMap.LiveMapUpdate()
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

   jsonInterface.save(pathJson .. "LiveMap.json", liveMap)

   if aPlayerIsLoggedIn() then
      tes3mp.StartTimer(timerLiveMapUpdate)
   end
end

function LiveMap.UnloadMarkerCell()
   local heightMapMarkerClick = jsonInterface.load(pathJson .. "HeightMapMarkerClick.json")
   local cell = GetCellByExteriorXY(heightMapMarkerClick.x, heightMapMarkerClick.y)
   logicHandler.UnloadCell(cell)
end

function TimerLiveMapUpdateExpired()
   LiveMap.LiveMapUpdate()
end


customEventHooks.registerHandler("OnPlayerAuthentified", LiveMap.LiveMapUpdate)
customEventHooks.registerHandler("OnPlayerDisconnect", LiveMap.LiveMapUpdate)
customEventHooks.registerHandler("OnServerPostInit", LiveMap.LiveMapUpdate)
customEventHooks.registerHandler("OnServerExit", LiveMap.UnloadMarkerCell)
