import WeekOverview from "@/src/app/components/WeekOverview";

const Page = () => {

  return (
        <div className="flex-1 flex flex-row gap-4">
            <div className="bg-blue-400 flex-1">
                <WeekOverview/>
            </div>

            <div className="bg-green-400 flex-1">

            </div>

            <div className="bg-red-400 flex-1">

            </div>
        </div>
    )
}

export default Page;