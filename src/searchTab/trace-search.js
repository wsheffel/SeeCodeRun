/* global $ */
/* global ace */
import {TraceModel} from '../traceService/trace-model';

export class TraceSearch{
    constructor(eventAggregator){
        this.eventAggregator = eventAggregator;
        this.traceModel = new TraceModel();
        this.searchBox = {
            aceEditor: undefined,
            updateAceMarkers: this.updateAceMarkers,
            $searchTerm: undefined,
            $searchFilter: undefined,
            $table : undefined,
            searchBoxChanged: undefined,
            updateTable: this.updateTable,
            searchFilters: this.traceModel.traceSearchfilters,
            traceHelper: undefined,
            $searchNumResults: undefined,
            traceSearchEvents : this.traceModel.traceSearchEvents,
            eventAggregator: eventAggregator,
            publishTraceSearchChanged: this.publishTraceSearchChanged
        };
    }

    attached(aceEditor, $table = $("#traceTable")){
        let searchBox = this.searchBox;
        
        searchBox.aceEditor = aceEditor;
        searchBox.$table = $table;
        searchBox.$searchTerm = $("#searchTerm");
        searchBox.$searchFilter = $("#searchFilter");
        searchBox.$searchNumResults = $("#numResultCount");
        
        searchBox.$searchFilter.empty();
        let options ="";
        for (let id in searchBox.searchFilters){
            let value = searchBox.searchFilters[id];
            options += `<option value="${id}">${value}</option>`;
        }
        searchBox.$searchFilter.append(options);
        
        let searchBoxChanged = function searchBoxChanged(e){
            let selectedFilter = searchBox.$searchFilter.find(":selected").val();
            let value = searchBox.$searchTerm.val();
            
            searchBox.publishTraceSearchChanged(searchBox, value, selectedFilter);
        };
        searchBox.searchBoxChanged = searchBoxChanged;
        searchBox.$searchTerm.change(searchBoxChanged);
        searchBox.$searchFilter.change(searchBoxChanged);
        
        this.subscribe(); 
    }
    
    publishTraceSearchChanged(searchBox, searchTermText, searchFilterId){
        searchBox.eventAggregator.publish(searchBox.traceSearchEvents.searchBoxChanged.event, 
            { searchTermText: searchTermText, searchFilterId: searchFilterId }
        );
    }
    
    subscribe(){
        let searchBox = this.searchBox;
        let traceChangedEvent = this.traceModel.traceEvents.changed.event;
        let searchBoxChangedEvent = this.traceModel.traceSearchEvents.searchBoxChanged.event;
        
        this.eventAggregator.subscribe( traceChangedEvent, payload =>{
            searchBox.traceHelper = payload.data;
            searchBox.searchBoxChanged(traceChangedEvent);
        });
        
        this.eventAggregator.subscribe( searchBoxChangedEvent, payload =>{
            let value = payload.searchTermText;
            let selectedFilter = payload.searchFilterId;
            
            if(searchBox.traceHelper){
                let variableValues =searchBox.traceHelper.getValues();
                let query = searchBox.traceHelper.traceQueryManager.getQuery(variableValues, selectedFilter, value);
                searchBox.updateTable(searchBox, query);
            }
        });
    }
    
    updateTable(searchBox, query){
        
        var Range = ace.require("ace/range").Range;
        
        let $table = searchBox.$table;
        let $numResults = searchBox.$searchNumResults;
        
        if(!$table){
            throw "No table container received.";
        }

        if(!query){
            throw "No query received.";
        }
        
        if(query.count()<1){
            $table.innerHTML = "No Results Found. Try a different Search Term with Filter Option.";
            return;
        }
        let table = "<table>";

        let header ="<tr>";
        let hasRange = false;
        
        let columns = [];
        for(let key in query.items[0]){
            if(key === "range"){
                hasRange = true;
            }else{
                header += `<td>${key}</td>`;
                columns[key] = true;
            }
        }
        header += "</tr>";
        
        table += header;
        let ranges =[];
        
        for(let i = 0; i < query.items.length; i++){
            
            if (hasRange){
                let itemRange = query.items[i]["range"];
                let range = new Range(itemRange.start.row, itemRange.start.column, itemRange.end.row, itemRange.end.column);
                ranges.push(range);
            }
            
            let row = "<tr>";
            for(let key in columns){
                //TODO add tooltip and new css when selected
                row += `<td>${JSON.stringify(query.items[i][key])}</td>`;
            }
            row += "</tr>";
            
            table+= row;
         }
        
        table += "</table>";
        $table.html(table);   
        $numResults.html("<p>Number of Search Results: "+query.count()+"</p>");
        
        if(ranges){
            searchBox.updateAceMarkers(ranges);
        }
    }
    
    updateAceMarkers(ranges, self = this){
        let editSession = self.aceEditor.getSession();
        
        if(self.markers){
            let oldmarkers = self.markers;
            for(let i in oldmarkers){
                let marker = oldmarkers[i];
                editSession.removeMarker(marker);
            }
        }
        
        let newMarkers = [];
        for(let i in ranges){
            let range = ranges[i];
            let marker = editSession.addMarker(range, "expression-range", "text");
            newMarkers.push(marker);
        }
        self.markers = newMarkers;
    }
  
}