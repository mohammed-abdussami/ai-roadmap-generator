import { useCallback } from 'react';
import { useStore, getSmoothStepPath } from 'reactflow';
import { getEdgeParams } from '../../helpers/position';
import styles from './styles.module.css';
import clsx from 'clsx';

function FloatingEdge({ id, source, target, markerEnd, style, data, ...props }) {
    const sourceNode = useStore(useCallback((store) => store.nodeInternals.get(source), [source]));
    const targetNode = useStore(useCallback((store) => store.nodeInternals.get(target), [target]));

    if (!sourceNode || !targetNode) return null;

    let resultSx, resultSy, resultTx, resultTy, resultSourcePos, resultTargetPos;

    if (data?.locked) {
        resultSx = props.sourceX;
        resultSy = props.sourceY;
        resultTx = props.targetX;
        resultTy = props.targetY;
        resultSourcePos = props.sourcePosition;
        resultTargetPos = props.targetPosition;
    } else {
        const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);
        resultSx = sx; resultSy = sy;
        resultTx = tx; resultTy = ty;
        resultSourcePos = sourcePos;
        resultTargetPos = targetPos;
    }

    const isBase = data?.level === 0 || data?.level === 1;
    const isClone = data?.clone;

    const edgeColor = isClone ? 'transparent' : isBase ? '#6C70FE' : '#7dd3fc';
    const arrowId = isBase ? 'arrow-base' : 'arrow-branch';

    const returnClassName = () => {
        if (isClone) return ['react-flow__edge-path', styles.edgeClone];
        if (isBase) return ['react-flow__edge-path', styles.baseEdge];
        return ['react-flow__edge-path', styles.otherEdge];
    };

    const [edgePath] = getSmoothStepPath({
        sourceX: resultSx,
        sourceY: resultSy,
        sourcePosition: resultSourcePos,
        targetPosition: resultTargetPos,
        targetX: resultTx,
        targetY: resultTy,
        borderRadius: 6,
        offset: 20
    });

    return (
        <>
            {/* Arrowhead marker defs — rendered once per edge type */}
            <defs>
                <marker
                    id="arrow-base"
                    markerWidth="10"
                    markerHeight="10"
                    refX="8"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <path d="M0,0 L0,6 L9,3 z" fill="#6C70FE" />
                </marker>
                <marker
                    id="arrow-branch"
                    markerWidth="10"
                    markerHeight="10"
                    refX="8"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <path d="M0,0 L0,6 L9,3 z" fill="#7dd3fc" />
                </marker>
            </defs>

            {/* Glow / shadow layer under the real path */}
            {!isClone && (
                <path
                    d={edgePath}
                    stroke={edgeColor}
                    strokeWidth={8}
                    strokeOpacity={0.15}
                    fill="none"
                />
            )}

            {/* Main visible edge */}
            <path
                id={id}
                className={clsx(returnClassName())}
                d={edgePath}
                strokeWidth={isBase ? 2.5 : 1.8}
                markerEnd={isClone ? undefined : `url(#${arrowId})`}
                fill="none"
                style={style}
            />
        </>
    );
}

export default FloatingEdge;