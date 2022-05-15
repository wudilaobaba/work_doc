package com.whj.demo.controller;

import com.whj.demo.service.CreateFileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/create_file")
public class CreateFileController {
    @Autowired
    private CreateFileService createFileService;
    @RequestMapping(value = "/start",method = {RequestMethod.POST,RequestMethod.GET})
    public String CreateFile(
            @RequestParam(name="target_txt_zone_url")
            String targetTxtZoneUrl,
            @RequestParam(name="file_url")
            String fileUrl,
            @RequestParam(name="last_txt_file_name")
            String lastTxtFileName,
            @RequestParam(name="size_per_page")
            Integer sizePerPage
    ){
        return this.createFileService.createFile(targetTxtZoneUrl,fileUrl,lastTxtFileName,sizePerPage);
    }
}
