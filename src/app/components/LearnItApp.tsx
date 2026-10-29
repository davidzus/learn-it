"use client"

import {useState} from "react";
import NavBar from "./NavBar";
import Timer from "./Timer";
import TopicManager from "./TopicManager";
import Statistics from "./Statistics";
import SessionHistory from "./SessionHistory";
import SettingsDialog from "./SettingsDialog";
import GoalBar from "./GoalBar";
import LearningCalendar from "./LearningCalendar";

const LearnItApp = () => {
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <>
            <NavBar onSettingsClick={() => setSettingsOpen(true)}/>
            <div className="px-4 pt-4">
                <GoalBar/>
            </div>
            <main className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:items-start">
                <div className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
                    <Timer/>
                    <TopicManager/>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <LearningCalendar/>
                    <Statistics/>
                </div>

                <div className="lg:w-80 lg:shrink-0">
                    <SessionHistory/>
                </div>
            </main>
            <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)}/>
        </>
    );
};

export default LearnItApp;
