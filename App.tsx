import React, {Component, useRef} from 'react';
import {Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

export interface DiagramRequestReq {
    date: string;
    value: number;
}

export interface DiagramRequestItem {
    id: string,
    data: DiagramRequestReq,
    selected: boolean,

}

function getNumPxWidth(value: number) {
    let signs = 1;
    let x = value;
    while(x >= 10){
        x = Math.round(x / 10);
        signs++;
    }
    return signs*5;
}


function drawVerticalLine(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number, isDashed: boolean) {
    if(isDashed) {
        let y = y1;
        while (y < y2 - 3) {
            ctx.strokeStyle = "#ffbbff";
            //ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 3);
            //ctx.closePath();
            ctx.stroke();
            y += 6;
        }
    }
    else {
        ctx.strokeStyle = "#ffbbff";
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.closePath();
        ctx.stroke();
    }
}

class NiceScale{
    minPoint: number;
    maxPoint: number;
    maxTicks = 10;
    tickSpacing: number = 1.0;
    range: number = 1.0;
    niceMin: number = 1.0;
    niceMax: number = 1.0;

    constructor(min: number, max:number) {
        this.minPoint = min;
        this.maxPoint = max;
        this.calculate();
    }

    private calculate()
    {
        this.range = this.niceNum(this.maxPoint - this.minPoint, false);
        this.tickSpacing = this.niceNum(this.range / (this.maxTicks - 1), true);
        this.niceMin =
            Math.floor(this.minPoint / this.tickSpacing) * this.tickSpacing;
        this.niceMax =
            Math.ceil(this.maxPoint / this.tickSpacing) * this.tickSpacing;
    }

    private niceNum( range: number, round: boolean){
        let exponent = Math.floor(Math.log10(range));
        let fraction = range / Math.pow(10, exponent);
        let niceFraction = 1.0;
        if (round)
        {
            if (fraction < 1.5)
                niceFraction = 1;
            else if (fraction < 3)
                niceFraction = 2;
            else if (fraction < 7)
                niceFraction = 5;
            else
                niceFraction = 10;
        }
        else
        {
            if (fraction <= 1)
                niceFraction = 1;
            else if (fraction <= 2)
                niceFraction = 2;
            else if (fraction <= 5)
                niceFraction = 5;
            else
                niceFraction = 10;
        }

        return niceFraction * Math.pow(10, exponent);

    }
}

export default class App extends Component<{}> {
    state = {
        started: "01.01.2020",
        type: 1,
        period: 2,
        requests: [] as DiagramRequestReq[],
        slider: 10,
        oldPeriod: 0,
        canvasCtx: null,
        chartWidth: Math.round(Dimensions.get('window').width) * 0.85,
        chartHeight: Math.round(Dimensions.get('window').width / 2) + 60
    }

    render() {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Text>Simple Chart</Text>
            </View>
        );
    }
}
