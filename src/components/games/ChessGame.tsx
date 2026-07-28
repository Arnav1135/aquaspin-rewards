import React from 'react';
import { Unity, useUnityContext } from 'react-unity-webgl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const ChessGame: React.FC = () => {
  const { unityProvider, isLoaded, loadingProgression } = useUnityContext({
    loaderUrl: "/UnityChessBuild/Build/UnityChessBuild.loader.js",
    dataUrl: "/UnityChessBuild/Build/UnityChessBuild.data",
    frameworkUrl: "/UnityChessBuild/Build/UnityChessBuild.framework.js",
    codeUrl: "/UnityChessBuild/Build/UnityChessBuild.wasm",
  });

  const loadingPercentage = Math.round(loadingProgression * 100);

  return (
    <div className="w-full flex justify-center items-center py-10">
      <Card className="w-full max-w-5xl shadow-2xl border border-blue-500/30 bg-black/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            Chess 3D
          </CardTitle>
          <CardDescription className="text-gray-400 text-lg">
            Powered by custom FIDE Rules Engine, Unity WebGL, and StabilityManager
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-700 shadow-[0_0_50px_rgba(0,200,255,0.15)] bg-gray-900">
            
            {!isLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-blue-400 font-semibold text-lg">
                  Loading Engine... {loadingPercentage}%
                </p>
              </div>
            )}
            
            <Unity 
              unityProvider={unityProvider} 
              style={{ width: "100%", height: "100%" }} 
              className={isLoaded ? "opacity-100 transition-opacity duration-1000" : "opacity-0"}
            />
            
          </div>

          <div className="mt-6 flex justify-between items-center p-4 bg-gray-800/50 rounded-lg">
            <div className="text-gray-300 text-sm">
              <span className="font-bold text-white">Controls:</span> Click to select piece, click destination to move.
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white">
                Pass & Play
              </Button>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                vs AI Bot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
