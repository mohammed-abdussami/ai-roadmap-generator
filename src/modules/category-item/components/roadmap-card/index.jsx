"use client";

import Link from "next/link";
import Image from "next/image";
import ComponentWithStyle from "./styles";
import makeUrl from "@/shared/helper/make-url";
import { LINKS } from "@/shared/constants/links";
import { Text } from "@nextui-org/react";
import ReactTimeAgo from "react-time-ago";
import { useEffect, useState } from "react";

const RoadmapCard = ({ data }) => {
    const [mounted, setMounted] = useState(false);
    const [verboseDate, setVerboseDate] = useState(null);
    const [date, setDate] = useState(null);

    useEffect(() => {
        setMounted(true);
        if (data?.created) {
            setVerboseDate(new Date().toISOString());
            setDate(new Date(data.created));
        }
    }, [data]);

    return (
        <ComponentWithStyle>
            <Link
                target="_blank"
                key={`recent-roadmap-item-${data.code}`}
                href={makeUrl(LINKS.ROADMAP, { id: data.code })}
            >
                <div className="content">
                    <Image className="icon" alt="link" height={16} width={16} src="/link.svg" />
                    <Text className="text">{data.title}</Text>
                </div>

                <div className="details">
                    <Text className="text">
                        {mounted && date && verboseDate && (
                            <ReactTimeAgo
                                verboseDate={verboseDate}
                                date={date}
                                locale="en-US"
                            />
                        )}
                    </Text>

                    <Text className="text">{data.likes} likes</Text>
                </div>
            </Link>
        </ComponentWithStyle>
    );
};

export default RoadmapCard;

