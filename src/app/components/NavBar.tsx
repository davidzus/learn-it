"use client"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";

function NavBar({ onSettingsClick }: { onSettingsClick?: () => void }) {
    return (
        <div className="grid grid-cols-3 bg-[#292929] items-center">

            <div>
                {/* Empty Placeholder */}
            </div>
            <div className="justify-self-center">
                <h1 className="text-white text-4xl font-black">Learn-IT</h1>
            </div>
            <div className="justify-self-end p-2 bg-[#292929]">
                <button onClick={onSettingsClick} disabled={!onSettingsClick} title="Einstellungen"
                        className="p-2 bg-[#525252] text-white hover:bg-[#3D3D3D] disabled:opacity-50">
                    <FontAwesomeIcon icon={faGear} />
                </button>
            </div>
        </div>
    );
}

export default NavBar;
