package com.whj.demo.controller;

import com.whj.demo.service.SlipFileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/slip_file")
public class SlipFileController {
    @Autowired
    private SlipFileService slipFileService;
    @RequestMapping(value = "/start",method = {RequestMethod.GET,RequestMethod.POST})
    public String SlipFile(
            @RequestParam(name="target_url")
            String targetUrl,
            @RequestParam(name="final_zone_url")
            String finalZoneUrl,
            @RequestParam(name="size_per_page")
            Integer sizePerPage

    ){
        return this.slipFileService.SplitFiles(targetUrl,finalZoneUrl,sizePerPage);
    }
}
