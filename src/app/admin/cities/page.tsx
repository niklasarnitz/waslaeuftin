import { Button } from "@waslaeuftin/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@waslaeuftin/components/ui/card"
import { db } from "@waslaeuftin/server/db"
import Link from "next/link"

export default async function AdminCities () {
    const cities = await db.city.findMany({
        orderBy: {
            name: "asc"
        }
    })

    return<div className="p-4 space-y-2"><div className="flex flex-row justify-between items-center"> <h1 className="flex flex-1 text-2xl font-bold">
          Städte
        </h1><Link href='/admin/cities/create'><Button>Erstellen</Button></Link></div><div className="flex flex-col space-y-4">
    {cities.map(city => <Card key={city.id}><CardHeader><CardTitle className="flex flex-row justify-between items-center">{city.name}</CardTitle></CardHeader><CardContent>Slug: <i>{city.slug}</i>
    </CardContent></Card>)}
    </div></div>
}