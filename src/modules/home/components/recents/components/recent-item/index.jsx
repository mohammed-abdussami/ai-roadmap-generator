"use client";

import Link from "next/link";
import Image from "next/image";
import ComponentWithStyle from "./styles";
import makeUrl from "@/shared/helper/make-url";
import { LINKS } from "@/shared/constants/links";
import { Text } from "@nextui-org/react";
import Badge from "@/shared/components/badge";
import ReactTimeAgo from "react-time-ago";
import { useEffect, useState } from "react";

const RecentItem = ({ roadmap }) => {
    const [mounted, setMounted] = useState(false);
    const [verboseDate, setVerboseDate] = useState(null);
    const [date, setDate] = useState(null);

    useEffect(() => {
        setMounted(true);
        if (roadmap?.created) {
            setVerboseDate(new Date().toISOString());
            setDate(new Date(roadmap.created));
        }
    }, [roadmap]);

    return (
        <ComponentWithStyle>
            <Link
                target="_blank"
                key={`recent-roadmap-item-${roadmap.code}`}
                href={makeUrl(LINKS.ROADMAP, { id: roadmap.code })}
            >
                <div className="item">
                    <div className="content">
                        <Image className="icon" alt="link" height={16} width={16} src="/link.svg" />
                        <Text className="text">{roadmap.title}</Text>
                    </div>

                    <div className="details">
                        {roadmap?.expand?.category?.title ? (
                            <Badge
                                className="category"
                                size="xs"
                                isSquared
                                color="primary"
                                variant="flat"
                            >
                                {roadmap.expand.category.title}
                            </Badge>
                        ) : (
                            <div />
                        )}

                        <div className="counters">
                            <Text className="text">
                                {mounted && date && verboseDate && (
                                    <ReactTimeAgo
                                        verboseDate={verboseDate}
                                        date={date}
                                        locale="en-US"
                                    />
                                )}
                            </Text>

                            <Text className="text">likes {roadmap.likes}</Text>
                        </div>
                    </div>
                </div>
            </Link>
        </ComponentWithStyle>
    );
};

export default RecentItem;

