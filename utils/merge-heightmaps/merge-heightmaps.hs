-- |
-- Copyright:  (c) 2017 Ertugrul Söylemez
-- License:    BSD3
-- Maintainer: Ertugrul Söylemez <esz@posteo.de>

{-# LANGUAGE DeriveFunctor #-}

module Main (main) where

import Control.Exception
import qualified Data.Aeson as J
import qualified Data.ByteString.Lazy as Bl
import Data.HashMap.Strict (HashMap)
import qualified Data.HashMap.Strict as Mh
import Data.Monoid
import Data.Text (Text)
import System.Environment


newtype HeightMap a =
    HeightMap {
      fromHeightMap :: HashMap Text (HashMap Text a)
    }
    deriving (Functor)

instance (J.FromJSON a) => J.FromJSON (HeightMap a) where
    parseJSON = fmap HeightMap . J.parseJSON

instance (Ord a) => Monoid (HeightMap a) where
    mempty = HeightMap mempty
    mappend (HeightMap m1) (HeightMap m2) =
        HeightMap (Mh.unionWith (Mh.unionWith min) m1 m2)

instance (J.ToJSON a) => J.ToJSON (HeightMap a) where
    toJSON = J.toJSON . fromHeightMap


main :: IO ()
main = do
    args <- getArgs
    foldr merge
          (Bl.putStr . J.encode . fmap (ceiling :: Double -> Integer))
          args
          mempty

    where
    merge :: FilePath -> (HeightMap Double -> IO r) -> HeightMap Double -> IO r
    merge fp go m = do
        dm <- J.decode <$> Bl.readFile fp >>=
              maybe (throwIO (userError ("Decoding failed: " <> fp))) pure
        go (m <> dm)
