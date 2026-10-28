"use client"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGrip } from "@fortawesome/free-solid-svg-icons";

function testFunction() {
    console.log("Test function called");
}

function NavBar() {
    return (
        <div className="flex flex-row bg-[#292929] items-center justify-between">

            <div>
                {/* Empty Placeholder */}
            </div>
            <div className="justify-self-center">
                <h2 className="text-white text-4xl font-black">Learn-IT</h2>
            </div>
            <div className="justify-self-end p-2 bg-[#292929]">
                <button onClick={testFunction} className="p-2 bg-[#525252] text-white hover:bg-[#3D3D3D]">
                    <FontAwesomeIcon icon={faGrip} />
                </button>
            </div>
        </div>
    );
}

export default NavBar;