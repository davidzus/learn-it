import { Suspense } from "react";
import NavBar from "@/src/app/components/NavBar";
import LearnItProvider from "@/src/app/components/LearnItProvider";
import LearnItApp from "@/src/app/components/LearnItApp";

const Page = () => {

  return (
        <Suspense fallback={
            <>
                <NavBar/>
                <p className="flex flex-1 items-center justify-center p-8 text-neutral-500">Lade Learn-IT …</p>
            </>
        }>
            <LearnItProvider>
                <LearnItApp/>
            </LearnItProvider>
        </Suspense>
    )
}

export default Page;