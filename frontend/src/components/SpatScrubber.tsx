import React from 'react';

const SpatScrubber: React.FC = () => {
    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase">SPaT Timeline Scrubber</h3>
                <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-2 text-gray-400"><span className="w-2 h-2 bg-green-500 rounded-sm"></span> Northbound</span>
                    <span className="flex items-center gap-2 text-gray-400"><span className="w-2 h-2 bg-red-500 rounded-sm"></span> Eastbound</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-4 relative">
                 {/* Timeline Marker */}
                 <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white z-10 opacity-50"></div>
                 <div className="absolute top-0 bottom-0 left-1/2 -ml-3 mt-[-20px] text-xs text-white bg-gray-900 px-2 py-1 rounded">14:32:00 (LIVE)</div>

                 {/* Lanes */}
                 {[1, 2, 3].map((lane) => (
                    <div key={lane} className="h-10 bg-gray-900/50 rounded flex overflow-hidden relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-600 z-10">LANE 0{lane}</div>
                        {/* Segments */}
                        <div className="w-[40%] bg-green-500/80 h-full border-r border-gray-900"></div>
                        <div className="w-[10%] bg-yellow-500/80 h-full border-r border-gray-900"></div>
                        <div className="w-[30%] bg-red-500/80 h-full border-r border-gray-900"></div>
                        <div className="w-[20%] bg-green-500/80 h-full opacity-50"></div>
                    </div>
                 ))}
            </div>

            <div className="flex justify-between mt-4 text-xs text-gray-500 font-mono">
                <span>14:30:00</span>
                <span>14:31:00</span>
                <span>14:32:00</span>
                <span>14:33:00</span>
                <span>14:34:00</span>
            </div>
        </div>
    );
};

export default SpatScrubber;
