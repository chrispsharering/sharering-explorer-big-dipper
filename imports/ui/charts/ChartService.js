import numbro from 'numbro';

export function yAxesTickCallback(value, index, values, prependUsd) {
  const number = numbro(value).format({
      spaceSeparated: false,
      average: true
  });
  return prependUsd ? `$${number}` : number;
}

export function buildBlockchainDatasets(txData, isMobile) {
    const lineBorderWith = isMobile ? 1 : 2;
    const txDataset = [];
    const feeShrDataset = [];
    for(let i in txData) {
        txDataset.push(txData[i].txs);
        feeShrDataset.push(txData[i].sumFeeShr);
        // shrFeeBackgroundColors.push('rgba(71, 131, 196,1)');
        // txsBackgroundColors.push('rgba(71, 131, 196,1)');
    }
    return [{
        label: 'Market Cap',
        // yAxisID: 'marketCapsId',
        data: txDataset,
        fill: false,
        radius: 0,
        lineTension: 0,
        // pointHitRadius: this.pointHitRadiusValue,
        // pointHitRadius: 1,
        borderWidth: lineBorderWith,
        pointRadius: 0,
        pointHoverRadius: 5,
        // pointHoverBackgroundColor: 'white',
        pointHoverBorderWidth: 0
      },
      {
        label: 'Tx Volume',
        // yAxisID: 'transactionsId',
        data: feeShrDataset,
        fill: false,
        radius: 0,
        lineTension: 0,
        // pointHitRadius: this.pointHitRadiusValue,
        // pointHitRadius: 1,
        borderWidth: lineBorderWith,
        pointRadius: 0,
        pointHoverRadius: 5,
        // pointHoverBackgroundColor: 'white',
        pointHoverBorderWidth: 0
      },
      {
        label: 'Transfer Volume',
        // yAxisID: 'transferVolumeUsdsId',
        data: [],
        fill: false,
        radius: 0,
        lineTension: 0,
        // pointHitRadius: this.pointHitRadiusValue,
        // pointHitRadius: 1,
        borderWidth: lineBorderWith,
        pointRadius: 0,
        pointHoverRadius: 5,
        // pointHoverBackgroundColor: 'white',
        pointHoverBorderWidth: 0
      },
      {
        label: 'Tx Adoption Score',
        // yAxisID: 'txAdoptionScoresId',
        data: [],
        fill: false,
        radius: 0,
        lineTension: 0,
        // pointHitRadius: this.pointHitRadiusValue,
        // pointHitRadius: 1,
        borderWidth: lineBorderWith,
        pointRadius: 0,
        pointHoverRadius: 5,
        // pointHoverBackgroundColor: 'white',
        pointHoverBorderWidth: 0
      }
      // {
      //   data: temp_min,
      //   borderColor: '#ffcc00',
      //   fill: false
      // },
    ];
  }

  export function buildBlockchainOptions(animationDuration, pointRadius, hoverRadius, yAxesScales,
    chartColors, mirrorTicks, isLightTheme) {
     const fontFamily = '"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sans-serif';
    const colorScheme = buildColorScheme(isLightTheme);
    const scaleType = 'linear';
    return {
        lineOnHover: {
            enabled: true,
            lineColor: '#bbb',
            lineWidth: 0.5
        },
        tooltips: {
            mode: 'x',
            position: 'custom',
            displayColors: false,
            intersect: false,
            backgroundColor: colorScheme.tooltipBackgroundColor, //'rgba(255,255,255, 0.9)',
            borderColor: colorScheme.tooltipBorderColor,
            borderWidth: 0.3,
            cornerRadius: 2,
            caretSize: 0,
            titleFontSize: 10,
            titleFontColor: colorScheme.tooltipTitleFontColor,
            bodyFontColor: colorScheme.tooltipBodyFontColor,
            bodyFontSize: 13,
            titleFontFamily: fontFamily,
            bodyFontFamily: fontFamily,
        callbacks: {
        title: (tooltipItem) => {
            var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const date = new Date(tooltipItem[0].xLabel);
            return date.toLocaleString('US-en', options);
        },
        label: (tooltipItem, data) => {
            return tooltipTitleCallback(tooltipItem, data);
        }
        },
        },
        responsive: true,
        elements: {
            point: {
                radius: pointRadius,
                hoverRadius: hoverRadius,
                // borderColor: 'rgba(0,0,0,0.1)'
            }
        },
        legend: {
            display: false,
        },
        scales: {
            xAxes: [{
                gridLines: {
                    display: false,
                },
                type: 'time',
                // ticks: {
                //   padding: 50,
                // },
                // ticks: {
                //   tickMarkLength: 10
                // },
                ticks: {
                    fontColor: colorScheme.fontColor,
                },
                // afterUpdate: (chart) => {
                //     this.afterZoomUpdate(chart);
                // },
            }],
            yAxes: getYAxesScales(yAxesScales, false, mirrorTicks, colorScheme.gridLinesColor, chartColors)
        },
        plugins: {
        zoom: {
            // pan: { // Add only if zoom isn't drag: true
            //   // Boolean to enable panning
            //   enabled: true,

            //   // Panning directions. Remove the appropriate direction to disable
            //   // Eg. 'y' would only allow panning in the y direction
            //   mode: 'x'
            // },
            zoom: {
                enabled: true,
                drag: true,
                mode: 'x'
            }
        }
        },
        animation: {
            duration: animationDuration, // general animation time
        },
        hover: {
            animationDuration: animationDuration, // duration of animations when hovering an item
        },
        responsiveAnimationDuration: animationDuration, // animation duration after a resize

        updateScaleType: (isLogScale) => {
            return updateScaleType(isLogScale, mirrorTicks, isLightTheme);
        },
        changeScale: true,
        initialScaleChange: true,
        maxRankDifference: 1,
        };
    }

    function buildColorScheme(lightTheme) {
        const colorScheme = {
          fontColor: '',
          tooltipBackgroundColor: '',
          tooltipBorderColor: '',
          tooltipTitleFontColor: '',
          tooltipBodyFontColor: '',
          gridLinesColor: '',
          backgroundColor: ''
        }
        if(lightTheme) {
          colorScheme.fontColor = 'rgb(0, 0, 0)';
          colorScheme.tooltipBackgroundColor = 'rgba(255,255,255, 0.8)';
          colorScheme.tooltipBorderColor = 'rgb(0, 0, 0)';
          colorScheme.tooltipTitleFontColor = 'rgba(23, 24, 27, 0.85)';
          colorScheme.tooltipBodyFontColor = 'rgb(0, 0, 0)';
          colorScheme.gridLinesColor = 'rgba(0, 0, 0, 0.1)';
          colorScheme.backgroundColor = 'rgb(255, 255, 255)';
        } else {
          colorScheme.fontColor = 'rgb(255, 255, 255)';
          colorScheme.tooltipBackgroundColor = 'rgba(45, 45, 45, 0.8)';
          colorScheme.tooltipBorderColor = 'rgb(255, 255, 255)';
          colorScheme.tooltipTitleFontColor = 'rgba(232, 231, 228, 0.85)';
          colorScheme.tooltipBodyFontColor = 'rgb(255, 255, 255)';
          colorScheme.gridLinesColor = 'rgba(255, 255, 255, 0.1)';
          colorScheme.backgroundColor = 'rgb(41, 41, 41)';
        }
        return colorScheme;
      }

      function tooltipTitleCallback(tooltipItem, data) {
        // Return value for title
        // data.datasets[0].borderColor = data.datasets[0].borderColor.replace(', 1)', ', 0.25)'); // set the opacity
        // console.log(tooltipItem.datasetIndex)
        let changedLineNearest = false;
        let txLabel;
        let marketCap;
        let transferVolUsd;
        let txAdopLabel;
        const index = tooltipItem.index;
        if (tooltipItem.datasetIndex === 0) {
          marketCap = tooltipItem.yLabel;
          marketCap = marketCap.toLocaleString();
          txLabel = data.datasets[1].data[index].toLocaleString();
          transferVolUsd = data.datasets[2].data[index].toLocaleString();;
          txAdopLabel = data.datasets[3].data[index].toLocaleString();
          // data.datasets[1].borderColor = 'green';
          // data.datasets[2].borderColor = 'green';
        } else if (tooltipItem.datasetIndex === 1) {
          txLabel = tooltipItem.yLabel;
          txLabel = txLabel.toLocaleString();
          marketCap = data.datasets[0].data[index].toLocaleString();
          transferVolUsd = data.datasets[2].data[index].toLocaleString();;
          txAdopLabel = data.datasets[3].data[index].toLocaleString();
          // data.datasets[0].borderColor = 'blue';
          // data.datasets[2].borderColor = 'blue';
        } else if (tooltipItem.datasetIndex === 2) {
          transferVolUsd = tooltipItem.yLabel;
          transferVolUsd = transferVolUsd.toLocaleString();
          marketCap = data.datasets[0].data[index].toLocaleString();
          txLabel = data.datasets[1].data[index].toLocaleString();
          txAdopLabel = data.datasets[3].data[index].toLocaleString();
          // data.datasets[0].borderColor = 'blue';
          // data.datasets[2].borderColor = 'blue';
        } else if (tooltipItem.datasetIndex === 3) {
          txAdopLabel = tooltipItem.yLabel;
          marketCap = data.datasets[0].data[index].toLocaleString();
          transferVolUsd = data.datasets[2].data[index].toLocaleString();;
          txLabel = data.datasets[1].data[index].toLocaleString();
          // data.datasets[0].borderColor = 'black';
          // data.datasets[1].borderColor = 'black';
        }
        // if(changedLineNearest) {
        //   data.datasets[tooltipItem.datasetIndex].borderColor = 'red';
        //   this.blockchainChart.update();
        // }
        const transferVolumeUsdSupported = data.datasets[2].data.some((d) => d > 0);
        if(tooltipItem.datasetIndex === 2 || transferVolumeUsdSupported) {
          if(transferVolUsd.indexOf(".") === 1) { // Hack because the value is a string and so has a comma which breaks parseInt
            transferVolUsd = (Math.round(parseFloat(transferVolUsd) * 100) / 100).toFixed(2);
          } else if (transferVolUsd !== '0') {
            transferVolUsd = transferVolUsd.substring(0, transferVolUsd.indexOf("."));
          }
          return [`• Tx:              ${txLabel}`,
                  `• MC:             $${marketCap}`,
                  `• Transfer Vol:   $${transferVolUsd}`,
                  `• Tx Adop:        ${txAdopLabel}/100`];
        } else {
          return [`• Tx:        ${txLabel}`,
                  `• MC:       $${marketCap}`,
                  `• Tx Adop:  ${txAdopLabel}/100`];
        }
      }

      function getYAxesScales(yAxesScales, isLogScale, isMobile, gridLinesColor, chartColors) {
          console.log(chartColors)
        const scaleType = isLogScale ? 'logarithmic' : 'linear';
        const labelFontFamily = '"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sa';
        let mirrorTicks = false;
        let mcLabelOffset = 0;
        let transferVolLabelOffset = 0;
        let txCountLabelOffset = 0;
        let txAdopLabelOffset = 0;
        let mcPadding = 10;
        let transferVolPadding = 0;
        let txCountPadding = 0;
        let txAdopPadding = 0;
        if(isMobile) {
          mirrorTicks = true;
          mcLabelOffset = -6;
          transferVolPadding = 0;
          transferVolLabelOffset = 9;
          txCountPadding = 11;
          txCountLabelOffset = -6;
          txAdopPadding = 1;
          txAdopLabelOffset = 9;
        }
    
        return [{
            id: 'marketCapsId',
            type: scaleType,
            position: 'left',
            display: yAxesScales,
            fontColor: chartColors[0].borderColor,
            scaleLabel: {
              display: !isMobile && true,//this.displayMarketCaps,
              labelString: 'Market Cap',
              fontSize: 12,
              fontStyle: 'bold',
              fontFamily: labelFontFamily,
              fontColor: chartColors[0].borderColor,
            },
            ticks: {
              // display: false,
              fontColor: chartColors[0].borderColor,
              mirror: mirrorTicks,
              labelOffset: mcLabelOffset,
              padding: mcPadding,
              callback: (value, index, values) => {
                return formatValue(value, index, values, '$');
              },
            },
            gridLines: {
              drawBorder: false,
              display: true,
              color: gridLinesColor,
              zeroLineColor: gridLinesColor
              // tickMarkLength: 8
            },
            afterTickToLabelConversion: (scaleInstance) => {
              calculateTickValues(scaleInstance, 0);
              removeEndTicks(scaleInstance, true, false);
            },
          },
          {
            id: 'transactionsId',
            type: scaleType,
            position: 'right',
            fontColor: chartColors[1].borderColor,
            display: yAxesScales,
            scaleLabel: {
              display: !isMobile,
              labelString: 'Tx Volume',
              fontSize: 12,
              fontStyle: 'bold',
              fontFamily: labelFontFamily,
              fontColor: chartColors[1].borderColor,
            },
            ticks: {
              fontColor: chartColors[1].borderColor,
              mirror: mirrorTicks,
              labelOffset: txCountLabelOffset,
              padding: txCountPadding,
              callback: (value, index, values) => {
                return formatValue(value, index, values);
              },
            },
            gridLines: {
              drawBorder: false,
              display: false,
              color: gridLinesColor,
              zeroLineColor: gridLinesColor
            },
            afterTickToLabelConversion: (scaleInstance) => {
              calculateTickValues(scaleInstance, 1);
              removeEndTicks(scaleInstance, true, true);
            },
          },
          {
            id: 'transferVolumeUsdsId',
            type: scaleType,
            position: 'left',
            fontColor: chartColors[2].borderColor,
            display: yAxesScales,
            scaleLabel: {
              display: !isMobile,
              labelString: 'Transfer Volume',
              fontSize: 12,
              fontStyle: 'bold',
              fontFamily: labelFontFamily,
              fontColor: chartColors[2].borderColor,
            },
            ticks: {
              fontColor: chartColors[2].borderColor,
              mirror: mirrorTicks,
              labelOffset: transferVolLabelOffset,
              padding: transferVolPadding,
              callback: (value, index, values) => {
                return formatValue(value, index, values, '$');
              },
            },
            gridLines: {
              drawBorder: false,
              display: false,
              color: gridLinesColor,
              zeroLineColor: gridLinesColor
            },
            afterTickToLabelConversion: (scaleInstance) => {
              calculateTickValues(scaleInstance, 2);
              removeEndTicks(scaleInstance, true, true);
            }
          },
          {
            id: 'txAdoptionScoresId',
            type: 'linear',
            position: 'right',
            fontColor: chartColors[3].borderColor,
            display: yAxesScales,
            scaleLabel: {
              display: !isMobile,
              labelString: 'Tx Adop. Score',
              fontSize: 12,
              fontStyle: 'bold',
              fontFamily: labelFontFamily,
              fontColor: chartColors[3].borderColor,
            },
            ticks: {
              // display: false,
              fontColor: chartColors[3].borderColor,
              mirror: mirrorTicks,
              labelOffset: txAdopLabelOffset,
              padding: txAdopPadding,
              max: 100,
              min: -20,
              // min: -20,//see if i can use -40 or -30 here
              stepSize: 20
            },
            gridLines: {
              drawBorder: false,
              display: false,
              color: gridLinesColor,
              zeroLineColor: gridLinesColor
            },
            afterTickToLabelConversion: (scaleInstance) => {
              removeEndTicks(scaleInstance, false, true);
            },
          }];
      }

    function formatValue(value, index, values, dollar = '', roundTo = 1, enforceDecimal = false) {
        if (value < 1000)  {
          value = round(value, roundTo, false);
          return `${dollar}${value}`;
        } else if (value >= 1000 && value < 1000000)  {
          value = round((value / 1000), roundTo, (true && enforceDecimal));
          return `${dollar}${value} K`;
        } else if (value >= 1000000 && value < 1000000000)  {
          value = round((value / 1000000), roundTo, (true && enforceDecimal));
          return `${dollar}${value} M`;
        } else if (value >= 1000000000 && value < 1000000000000)  {
          value = round((value / 1000000000), roundTo, (true && enforceDecimal));
          return `${dollar}${value} B`;
        } else if (value >= 1000000000000 && value < 1000000000000000)  {
          value = round((value / 1000000000000), roundTo, (true && enforceDecimal));
          return `${dollar}${value} T`;
        }
      }
    
    function round(value, precision = 0, enforceDecimal) {
        const multiplier = Math.pow(10, precision);
        const valueToPrecision = Math.round(value * multiplier) / multiplier;
        let valueString = valueToPrecision.toString();
        if(precision > 0 && enforceDecimal) {
          if(!valueString.includes('.')) { 
            valueString += '.';
          }
          while(valueString.indexOf('.') > valueString.length - 1 - precision) {
            valueString += '0';
          }
        }
        return valueString;
      }

      function calculateTickValues(scaleInstance, dataSetIndex) {
        if (scaleInstance.zoomedData && scaleInstance.zoomedData.length > 0) {
          const max = Math.max(...scaleInstance.zoomedData);
          const min = Math.min(...scaleInstance.zoomedData);
          let ceiling = 10;
          let floor = 0;
          if (max >= 5 ) {
            let multiplier = 1;
            ceiling = max + (0.1 * (max - min));
    
            for (; ceiling >= 10; ceiling /= 10) {
              multiplier *= 10;
            }
            ceiling = Math.ceil(ceiling * 10) / 10; // Ensures it rounds up correctly
            ceiling = parseFloat(ceiling.toFixed(1));
            ceiling *= multiplier;
    
            multiplier = 1;
            floor = min - (0.1 * (ceiling - min));
            if (floor > 10) {
              for (; floor >= 10; floor /= 10) {
                multiplier *= 10;
              }
              floor = Math.floor(floor * 10) / 10; // Ensures it rounds down correctly
              floor = parseFloat(floor.toFixed(1));
              floor *= multiplier;
            } else {
              floor = 0;
            }
          }
          const range = ceiling - floor;
          const stepSize = range / 5;
          scaleInstance.chart.options.scales.yAxes[dataSetIndex].ticks.min = floor - stepSize;
          scaleInstance.chart.options.scales.yAxes[dataSetIndex].ticks.max = ceiling;
          scaleInstance.chart.options.scales.yAxes[dataSetIndex].ticks.stepSize = stepSize;
        }
        // i need to fix that the market cat is the default line which the tooltip is drawn off, somewhere its using that index, should be txcount
      }

      function removeEndTicks(scaleInstance, removeMaxTick, removeGridLine) {
        if(scaleInstance) {
          // set the first and last tick to null so it does not display
          // note, ticks[0] is the last tick and ticks[length - 1] is the first
          if(scaleInstance.ticks) {
            scaleInstance.ticks[6] = null;
            if(removeMaxTick) {
              scaleInstance.ticks[0] = ''; //This just hides the string value of the tick, it doesn't remove it
            }
          }
          // need to do the same thing for this similiar array which is used internally
          if(scaleInstance.ticksAsNumbers) {
            scaleInstance.ticksAsNumbers[6] = null;
            if(removeMaxTick && removeGridLine) {
              scaleInstance.ticksAsNumbers[0] = null;
            }
          }
        }
        // scaleInstance.ticksAsNumbers[scaleInstance.ticksAsNumbers.length - 1] = null;
      }

      function updateScaleType(isLogScale, mirrorTicks, isLightTheme) {
        if(isLogScale) {
          
        } else {
          
        }
        const colorScheme = buildColorScheme(isLightTheme);
        const yAxesScales = getYAxesScales(true, isLogScale, mirrorTicks, colorScheme.gridLinesColor);
        return yAxesScales;
      }