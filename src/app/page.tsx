import { Suspense } from "react";
import NavBar from "@/src/app/components/NavBar";
import LearnItProvider from "@/src/app/components/LearnItProvider";
import LearnItApp from "@/src/app/components/LearnItApp";

const LoadingScreen = () => (
    <>
        <NavBar/>
        <p className="flex flex-1 items-center justify-center p-8 text-neutral-500">Lade Learn-IT …</p>
    </>
);

const Page = () => (
    <Suspense fallback={<LoadingScreen/>}>
        <LearnItProvider>
            <LearnItApp/>
        </LearnItProvider>
    </Suspense>
);

export default Page;
